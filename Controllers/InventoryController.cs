using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmaChain.Data;
using PharmaChain.Models;

namespace PharmaChain.Controllers
{
    [ApiController]
    [Route("api/inventory")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _db;
        public InventoryController(AppDbContext db) => _db = db;

        private string GetUsername() => User.Identity?.Name ?? "unknown";
        private int GetUserId() =>
            int.TryParse(User.FindFirst("sub")?.Value, out var uid) ? uid : 0;
        private string GetIp() =>
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        private void AddAuditLog(string action, string details) =>
            _db.AuditLogs.Add(new AuditLog
            {
                UserId    = GetUserId(),
                Username  = GetUsername(),
                Action    = action,
                Details   = details,
                Timestamp = DateTime.UtcNow,
                IpAddress = GetIp()
            });

        // ── GET /api/inventory ────────────────────────────────────────────────
        [HttpGet]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string?  search,
            [FromQuery] string?  category,
            [FromQuery] bool?    lowStockOnly,
            [FromQuery] bool?    expiredOnly,
            [FromQuery] bool?    nearExpiryOnly)
        {
            // ── AUTO-SEED: import drugs that don't have an inventory entry yet ──
            var linkedDrugIds = await _db.InventoryItems
                .Where(i => i.DrugId.HasValue && i.IsActive)
                .Select(i => i.DrugId!.Value)
                .Distinct()
                .ToListAsync();

            var unlinkedDrugs = await _db.Drugs
                .Where(d => !linkedDrugIds.Contains(d.Id))
                .ToListAsync();

            if (unlinkedDrugs.Any())
            {
                var newItems = new List<InventoryItem>();
                foreach (var drug in unlinkedDrugs)
                {
                    var inv = new InventoryItem
                    {
                        Name              = drug.Name,
                        Description       = drug.Manufacturer,
                        Category          = "Medication",
                        BatchNumber       = drug.BatchNumber,
                        ExpiryDate        = drug.ExpiryDate,
                        PurchasePrice     = 0m,
                        SellingPrice      = 0m,
                        CurrentStock      = drug.Quantity,
                        LowStockThreshold = 10,
                        DrugId            = drug.Id,
                        AddedByUsername   = "system",
                        IsActive          = true,
                        CreatedAt         = drug.CreatedAt,
                        UpdatedAt         = DateTime.UtcNow
                    };
                    _db.InventoryItems.Add(inv);
                    newItems.Add(inv);
                }
                await _db.SaveChangesAsync();

                // Add INITIAL movement for each auto-seeded item with stock
                foreach (var inv in newItems.Where(i => i.CurrentStock > 0))
                {
                    _db.InventoryMovements.Add(new InventoryMovement
                    {
                        InventoryItemId     = inv.Id,
                        ActionType          = "INITIAL",
                        QuantityChanged     = inv.CurrentStock,
                        StockBefore         = 0,
                        StockAfter          = inv.CurrentStock,
                        PerformedByUsername = "system",
                        Notes               = "مستورد تلقائياً من سجل الأدوية",
                        Timestamp           = DateTime.UtcNow
                    });
                }
                await _db.SaveChangesAsync();
            }

            var query = _db.InventoryItems.Where(i => i.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(i =>
                    i.Name.Contains(search) || i.BatchNumber.Contains(search));

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(i => i.Category == category);

            if (lowStockOnly == true)
                query = query.Where(i =>
                    i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold);

            if (expiredOnly == true)
                query = query.Where(i => i.ExpiryDate < DateTime.UtcNow);

            var now   = DateTime.UtcNow;
            var items = await query.OrderBy(i => i.Name).ToListAsync();

            if (nearExpiryOnly == true)
                items = items
                    .Where(i => i.ExpiryDate >= now && i.ExpiryDate <= now.AddDays(30))
                    .ToList();

            // Return distinct categories so the frontend can build a dynamic filter
            var categories = items.Select(i => i.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct()
                .OrderBy(c => c)
                .ToList();

            return Ok(new
            {
                stats = new
                {
                    total       = items.Count,
                    lowStock    = items.Count(i => i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold),
                    outOfStock  = items.Count(i => i.CurrentStock == 0),
                    expired     = items.Count(i => i.ExpiryDate < now),
                    nearExpiry  = items.Count(i => i.ExpiryDate >= now && i.ExpiryDate <= now.AddDays(30))
                },
                categories,
                items
            });
        }

        // ── POST /api/inventory/sync-drugs ────────────────────────────────────
        [HttpPost("sync-drugs")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SyncFromDrugs()
        {
            var linkedDrugIds = await _db.InventoryItems
                .Where(i => i.DrugId.HasValue && i.IsActive)
                .Select(i => i.DrugId!.Value)
                .Distinct()
                .ToListAsync();

            var unlinkedDrugs = await _db.Drugs
                .Where(d => !linkedDrugIds.Contains(d.Id))
                .ToListAsync();

            if (!unlinkedDrugs.Any())
                return Ok(new { message = "All drugs are already synced", imported = 0 });

            var newItems = new List<InventoryItem>();
            foreach (var drug in unlinkedDrugs)
            {
                var inv = new InventoryItem
                {
                    Name              = drug.Name,
                    Description       = drug.Manufacturer,
                    Category          = "Medication",
                    BatchNumber       = drug.BatchNumber,
                    ExpiryDate        = drug.ExpiryDate,
                    PurchasePrice     = 0m,
                    SellingPrice      = 0m,
                    CurrentStock      = drug.Quantity,
                    LowStockThreshold = 10,
                    DrugId            = drug.Id,
                    AddedByUsername   = "system",
                    IsActive          = true,
                    CreatedAt         = drug.CreatedAt,
                    UpdatedAt         = DateTime.UtcNow
                };
                _db.InventoryItems.Add(inv);
                newItems.Add(inv);
            }
            await _db.SaveChangesAsync();

            foreach (var inv in newItems.Where(i => i.CurrentStock > 0))
            {
                _db.InventoryMovements.Add(new InventoryMovement
                {
                    InventoryItemId     = inv.Id,
                    ActionType          = "INITIAL",
                    QuantityChanged     = inv.CurrentStock,
                    StockBefore         = 0,
                    StockAfter          = inv.CurrentStock,
                    PerformedByUsername = GetUsername(),
                    Notes               = "مستورد يدوياً من سجل الأدوية",
                    Timestamp           = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();

            AddAuditLog("SyncInventoryFromDrugs",
                $"Imported {newItems.Count} drugs into inventory automatically");
            await _db.SaveChangesAsync();

            return Ok(new { message = $"Successfully imported {newItems.Count} drug(s) into inventory", imported = newItems.Count });
        }

        // ── POST /api/inventory ───────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddItem([FromBody] AddItemRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return BadRequest(new { message = "Product name is required" });
            if (req.SellingPrice < 0)
                return BadRequest(new { message = "Selling price cannot be negative" });
            if (req.InitialStock < 0)
                return BadRequest(new { message = "Initial stock cannot be negative" });
            if (req.ExpiryDate <= DateTime.UtcNow)
                return BadRequest(new { message = "Expiry date must be in the future" });

            var item = new InventoryItem
            {
                Name              = System.Web.HttpUtility.HtmlEncode(req.Name.Trim()),
                Description       = req.Description ?? "",
                Category          = req.Category    ?? "",
                BatchNumber       = req.BatchNumber  ?? "",
                ExpiryDate        = req.ExpiryDate,
                PurchasePrice     = req.PurchasePrice,
                SellingPrice      = req.SellingPrice,
                CurrentStock      = req.InitialStock,
                LowStockThreshold = req.LowStockThreshold > 0 ? req.LowStockThreshold : 10,
                QrCode            = req.QrCode,
                DrugId            = req.DrugId,
                AddedByUsername   = GetUsername(),
                IsActive          = true,
                CreatedAt         = DateTime.UtcNow,
                UpdatedAt         = DateTime.UtcNow
            };

            _db.InventoryItems.Add(item);
            await _db.SaveChangesAsync();

            if (req.InitialStock > 0)
            {
                _db.InventoryMovements.Add(new InventoryMovement
                {
                    InventoryItemId     = item.Id,
                    ActionType          = "INITIAL",
                    QuantityChanged     = req.InitialStock,
                    StockBefore         = 0,
                    StockAfter          = req.InitialStock,
                    PerformedByUsername = GetUsername(),
                    Notes               = "Initial stock",
                    Timestamp           = DateTime.UtcNow
                });
            }

            AddAuditLog("AddInventoryItem",
                $"Added '{item.Name}' (ID: {item.Id}), InitialStock: {item.CurrentStock}");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Item added successfully", item });
        }

        // ── GET /api/inventory/{id} ───────────────────────────────────────────
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetItem(int id)
        {
            var item = await _db.InventoryItems.FindAsync(id);
            if (item == null || !item.IsActive)
                return NotFound(new { message = "Item not found" });

            var movements = await _db.InventoryMovements
                .Where(m => m.InventoryItemId == id)
                .OrderByDescending(m => m.Timestamp)
                .Take(50)
                .ToListAsync();

            var salesStats = await _db.SaleTransactions
                .Where(s => s.InventoryItemId == id)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    salesCount   = g.Count(),
                    totalSold    = g.Sum(s => s.QuantitySold),
                    totalRevenue = g.Sum(s => s.TotalPrice)
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                item,
                movements,
                salesStats = salesStats ?? new { salesCount = 0, totalSold = 0, totalRevenue = (decimal)0 }
            });
        }

        // ── PUT /api/inventory/{id} ───────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateItemRequest req)
        {
            var item = await _db.InventoryItems.FindAsync(id);
            if (item == null || !item.IsActive)
                return NotFound(new { message = "Item not found" });

            if (!string.IsNullOrWhiteSpace(req.Name))
                item.Name = System.Web.HttpUtility.HtmlEncode(req.Name.Trim());
            if (req.Description   != null) item.Description       = req.Description;
            if (req.Category      != null) item.Category          = req.Category;
            if (req.BatchNumber   != null) item.BatchNumber        = req.BatchNumber;
            if (req.ExpiryDate.HasValue)   item.ExpiryDate         = req.ExpiryDate.Value;
            if (req.PurchasePrice.HasValue) item.PurchasePrice     = req.PurchasePrice.Value;
            if (req.SellingPrice.HasValue)  item.SellingPrice      = req.SellingPrice.Value;
            if (req.LowStockThreshold.HasValue) item.LowStockThreshold = req.LowStockThreshold.Value;
            if (req.QrCode != null) item.QrCode = req.QrCode;
            item.UpdatedAt = DateTime.UtcNow;

            AddAuditLog("UpdateInventoryItem", $"Updated '{item.Name}' (ID: {item.Id})");
            await _db.SaveChangesAsync();

            return Ok(new { message = "Item updated successfully", item });
        }

        // ── DELETE /api/inventory/{id} ────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var item = await _db.InventoryItems.FindAsync(id);
            if (item == null || !item.IsActive)
                return NotFound(new { message = "Item not found" });

            item.IsActive  = false;
            item.UpdatedAt = DateTime.UtcNow;

            AddAuditLog("DeleteInventoryItem", $"Removed '{item.Name}' (ID: {item.Id})");
            await _db.SaveChangesAsync();

            return Ok(new { message = "Item removed from inventory" });
        }

        // ── POST /api/inventory/{id}/restock ──────────────────────────────────
        [HttpPost("{id}/restock")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Restock(int id, [FromBody] RestockRequest req)
        {
            if (req.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be greater than zero" });

            var item = await _db.InventoryItems.FindAsync(id);
            if (item == null || !item.IsActive)
                return NotFound(new { message = "Item not found" });

            var stockBefore   = item.CurrentStock;
            item.CurrentStock += req.Quantity;
            item.UpdatedAt    = DateTime.UtcNow;

            _db.InventoryMovements.Add(new InventoryMovement
            {
                InventoryItemId     = item.Id,
                ActionType          = "RESTOCK",
                QuantityChanged     = req.Quantity,
                StockBefore         = stockBefore,
                StockAfter          = item.CurrentStock,
                PerformedByUsername = GetUsername(),
                Notes               = req.Notes ?? "",
                Timestamp           = DateTime.UtcNow
            });

            AddAuditLog("RestockInventory",
                $"Restocked '{item.Name}' (ID: {item.Id}): +{req.Quantity}, new stock: {item.CurrentStock}");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Stock updated successfully", newStock = item.CurrentStock, item });
        }

        // ── POST /api/inventory/sales ─────────────────────────────────────────
        [HttpPost("sales")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ProcessSale([FromBody] SaleRequest req)
        {
            if (req.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be greater than zero" });

            var item = await _db.InventoryItems.FindAsync(req.InventoryItemId);
            if (item == null || !item.IsActive)
                return NotFound(new { message = "Item not found" });

            if (item.CurrentStock < req.Quantity)
                return BadRequest(new
                {
                    message = $"Insufficient stock. Available: {item.CurrentStock}, Requested: {req.Quantity}"
                });

            var unitPrice = req.UnitPrice > 0 ? req.UnitPrice : item.SellingPrice;
            var total     = unitPrice * req.Quantity;

            var sale = new SaleTransaction
            {
                InventoryItemId = item.Id,
                ProductName     = item.Name,
                Category        = item.Category,
                QuantitySold    = req.Quantity,
                UnitPrice       = unitPrice,
                TotalPrice      = total,
                SoldByUsername  = GetUsername(),
                Notes           = req.Notes ?? "",
                TransactionDate = DateTime.UtcNow
            };
            _db.SaleTransactions.Add(sale);
            await _db.SaveChangesAsync();

            var stockBefore   = item.CurrentStock;
            item.CurrentStock -= req.Quantity;
            item.UpdatedAt    = DateTime.UtcNow;

            _db.InventoryMovements.Add(new InventoryMovement
            {
                InventoryItemId     = item.Id,
                ActionType          = "SALE",
                QuantityChanged     = -req.Quantity,
                StockBefore         = stockBefore,
                StockAfter          = item.CurrentStock,
                PerformedByUsername = GetUsername(),
                Notes               = $"Sale #{sale.Id}",
                SaleTransactionId   = sale.Id,
                Timestamp           = DateTime.UtcNow
            });

            AddAuditLog("SaleTransaction",
                $"Sold {req.Quantity}x '{item.Name}' for {total:F2} JD (Sale ID: {sale.Id})");

            await _db.SaveChangesAsync();

            return Ok(new { message = "Sale processed successfully", sale, newStock = item.CurrentStock });
        }

        // ── GET /api/inventory/sales ──────────────────────────────────────────
        [HttpGet("sales")]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetSales(
            [FromQuery] int?      itemId,
            [FromQuery] string?   category,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int       limit = 200)
        {
            var query = _db.SaleTransactions.AsQueryable();

            if (itemId.HasValue)                       query = query.Where(s => s.InventoryItemId == itemId);
            if (!string.IsNullOrWhiteSpace(category))  query = query.Where(s => s.Category == category);
            if (fromDate.HasValue)                     query = query.Where(s => s.TransactionDate >= fromDate);
            if (toDate.HasValue)                       query = query.Where(s => s.TransactionDate <= toDate);

            var sales        = await query.OrderByDescending(s => s.TransactionDate).Take(limit).ToListAsync();
            var totalRevenue = sales.Sum(s => s.TotalPrice);
            var totalUnits   = sales.Sum(s => s.QuantitySold);

            return Ok(new { sales, totalRevenue, totalUnits, count = sales.Count });
        }

        // ── GET /api/inventory/movements/{itemId} ─────────────────────────────
        [HttpGet("movements/{itemId}")]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetMovements(int itemId, [FromQuery] int limit = 100)
        {
            var item = await _db.InventoryItems.FindAsync(itemId);
            if (item == null)
                return NotFound(new { message = "Item not found" });

            var movements = await _db.InventoryMovements
                .Where(m => m.InventoryItemId == itemId)
                .OrderByDescending(m => m.Timestamp)
                .Take(limit)
                .ToListAsync();

            return Ok(new { item, movements });
        }

        // ── GET /api/inventory/reports/summary ────────────────────────────────
        [HttpGet("reports/summary")]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetSummaryReport(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var now   = DateTime.UtcNow;
            var items = await _db.InventoryItems.Where(i => i.IsActive).ToListAsync();

            var salesQuery = _db.SaleTransactions.AsQueryable();
            if (fromDate.HasValue) salesQuery = salesQuery.Where(s => s.TransactionDate >= fromDate);
            if (toDate.HasValue)   salesQuery = salesQuery.Where(s => s.TransactionDate <= toDate);
            var sales = await salesQuery.ToListAsync();

            var topSelling = sales
                .GroupBy(s => new { s.InventoryItemId, s.ProductName, s.Category })
                .Select(g => new
                {
                    itemId   = g.Key.InventoryItemId,
                    name     = g.Key.ProductName,
                    category = g.Key.Category,
                    units    = g.Sum(s => s.QuantitySold),
                    revenue  = g.Sum(s => s.TotalPrice)
                })
                .OrderByDescending(g => g.units)
                .Take(5)
                .ToList<object>();

            var leastSelling = items
                .Select(i => new
                {
                    name  = i.Name,
                    stock = i.CurrentStock,
                    sold  = sales.Where(s => s.InventoryItemId == i.Id).Sum(s => s.QuantitySold)
                })
                .OrderBy(x => x.sold)
                .Take(5)
                .ToList<object>();

            var categoryBreakdown = items
                .GroupBy(i => string.IsNullOrEmpty(i.Category) ? "Other" : i.Category)
                .Select(g => new
                {
                    category   = g.Key,
                    count      = g.Count(),
                    totalStock = g.Sum(i => i.CurrentStock),
                    revenue    = sales
                        .Where(s => g.Select(i => i.Id).Contains(s.InventoryItemId))
                        .Sum(s => s.TotalPrice)
                })
                .OrderByDescending(g => g.totalStock)
                .ToList<object>();

            return Ok(new
            {
                overview = new
                {
                    totalItems       = items.Count,
                    lowStock         = items.Count(i => i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold),
                    outOfStock       = items.Count(i => i.CurrentStock == 0),
                    expired          = items.Count(i => i.ExpiryDate < now),
                    nearExpiry       = items.Count(i => i.ExpiryDate >= now && i.ExpiryDate <= now.AddDays(30)),
                    totalStockValue  = items.Sum(i => (double)i.CurrentStock * (double)i.PurchasePrice),
                    totalSalesValue  = (double)sales.Sum(s => s.TotalPrice),
                    totalUnitsSold   = sales.Sum(s => s.QuantitySold),
                    totalTransactions= sales.Count
                },
                topSelling,
                leastSelling,
                categoryBreakdown
            });
        }

        // ── GET /api/inventory/reports/top-selling ────────────────────────────
        [HttpGet("reports/top-selling")]
        [Authorize(Roles = "Admin,LedgerAdmin")]
        public async Task<IActionResult> GetTopSelling(
            [FromQuery] int       limit    = 10,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate   = null)
        {
            var query = _db.SaleTransactions.AsQueryable();
            if (fromDate.HasValue) query = query.Where(s => s.TransactionDate >= fromDate);
            if (toDate.HasValue)   query = query.Where(s => s.TransactionDate <= toDate);

            var topSelling = await query
                .GroupBy(s => new { s.InventoryItemId, s.ProductName, s.Category })
                .Select(g => new
                {
                    itemId           = g.Key.InventoryItemId,
                    name             = g.Key.ProductName,
                    category         = g.Key.Category,
                    totalSold        = g.Sum(s => s.QuantitySold),
                    totalRevenue     = g.Sum(s => s.TotalPrice),
                    transactionCount = g.Count()
                })
                .OrderByDescending(g => g.totalSold)
                .Take(limit)
                .ToListAsync();

            return Ok(new { topSelling });
        }

        // ── GET /api/inventory/alerts ─────────────────────────────────────────
        [HttpGet("alerts")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAlerts()
        {
            var now   = DateTime.UtcNow;
            var items = await _db.InventoryItems.Where(i => i.IsActive).ToListAsync();

            return Ok(new
            {
                totalAlerts = items.Count(i =>
                    i.CurrentStock == 0 ||
                    (i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold) ||
                    i.ExpiryDate <= now.AddDays(30)),

                outOfStock = items
                    .Where(i => i.CurrentStock == 0)
                    .Select(i => new { i.Id, i.Name, i.Category, i.CurrentStock, alertType = "OUT_OF_STOCK" })
                    .ToList<object>(),

                lowStock = items
                    .Where(i => i.CurrentStock > 0 && i.CurrentStock <= i.LowStockThreshold)
                    .Select(i => new { i.Id, i.Name, i.Category, i.CurrentStock, i.LowStockThreshold, alertType = "LOW_STOCK" })
                    .ToList<object>(),

                expired = items
                    .Where(i => i.ExpiryDate < now)
                    .Select(i => new { i.Id, i.Name, i.Category, i.CurrentStock, expiryDate = i.ExpiryDate, alertType = "EXPIRED" })
                    .ToList<object>(),

                nearExpiry = items
                    .Where(i => i.ExpiryDate >= now && i.ExpiryDate <= now.AddDays(30))
                    .Select(i => new
                    {
                        i.Id, i.Name, i.Category, i.CurrentStock,
                        expiryDate = i.ExpiryDate,
                        daysLeft   = (int)(i.ExpiryDate - now).TotalDays,
                        alertType  = "NEAR_EXPIRY"
                    })
                    .ToList<object>()
            });
        }
    }

    // ── Request DTOs ──────────────────────────────────────────────────────────

    public class AddItemRequest
    {
        public string   Name              { get; set; } = "";
        public string?  Description       { get; set; }
        public string?  Category          { get; set; }
        public string?  BatchNumber       { get; set; }
        public DateTime ExpiryDate        { get; set; }
        public decimal  PurchasePrice     { get; set; }
        public decimal  SellingPrice      { get; set; }
        public int      InitialStock      { get; set; }
        public int      LowStockThreshold { get; set; } = 10;
        public string?  QrCode            { get; set; }
        public int?     DrugId            { get; set; }
    }

    public class UpdateItemRequest
    {
        public string?  Name              { get; set; }
        public string?  Description       { get; set; }
        public string?  Category          { get; set; }
        public string?  BatchNumber       { get; set; }
        public DateTime? ExpiryDate       { get; set; }
        public decimal?  PurchasePrice    { get; set; }
        public decimal?  SellingPrice     { get; set; }
        public int?      LowStockThreshold{ get; set; }
        public string?   QrCode           { get; set; }
    }

    public class RestockRequest
    {
        public int     Quantity { get; set; }
        public string? Notes    { get; set; }
    }

    public class SaleRequest
    {
        public int     InventoryItemId { get; set; }
        public int     Quantity        { get; set; }
        public decimal UnitPrice       { get; set; }
        public string? Notes           { get; set; }
    }
}
