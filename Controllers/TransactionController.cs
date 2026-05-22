using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;
using PharmaChain.Data;
using PharmaChain.Models;
using PharmaChain.Services;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly BlockchainService _blockchain;
        private readonly NodeSyncService _nodeSync;
        private readonly string _chainFilePath;

        public TransactionController(AppDbContext context, BlockchainService blockchain,
                                     IWebHostEnvironment env, NodeSyncService nodeSync)
        {
            _context      = context;
            _blockchain   = blockchain;
            _nodeSync     = nodeSync;
            _chainFilePath = Path.Combine(env.ContentRootPath, "blockchain_chain.json");
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/transfer
        // ════════════════════════════════════════════════════════
        [HttpPost("transfer")]
        public IActionResult Transfer([FromBody] TransferDto request)
        {
            var drug = _context.Drugs.Find(request.DrugId);
            if (drug == null) return NotFound("الدواء غير موجود");

            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
            var role     = User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

            var allowedTransfers = new Dictionary<string, string>
            {
                { "Factory",     "Distributor" },
                { "Distributor", "Pharmacy"    },
                { "Pharmacy",    "Customer"    }
            };

            if (!allowedTransfers.ContainsKey(role))
                return BadRequest("ليس لديك صلاحية النقل");

            var transaction = _blockchain.CreateTransaction(
                drug.Id, drug.Name,
                fromRole: role,                    fromUsername: username,
                toRole:   allowedTransfers[role],  toUsername:   request.ToUsername,
                status:   "Transferred",           actionType:   "TRANSFER"
            );

            _context.AuditLogs.Add(new AuditLog
            {
                UserId    = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                Username  = username,
                Action    = "TransferDrug",
                Details   = $"نقل دواء {drug.Name} من {role} إلى {allowedTransfers[role]} | Block #{transaction.BlockNumber} | Nonce: {transaction.Nonce}",
                Timestamp = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
            });
            _context.SaveChanges();
            _blockchain.SaveChainToJson();

            _ = _nodeSync.BroadcastBlock(new
            {
                blockNumber  = transaction.BlockNumber,
                drugName     = transaction.DrugName,
                fromRole     = transaction.FromRole,
                toRole       = transaction.ToRole,
                actionType   = transaction.ActionType,
                blockHash    = transaction.BlockHash,
                previousHash = transaction.PreviousHash,
                nonce        = transaction.Nonce,
                merkleRoot   = transaction.MerkleRoot,
                timestamp    = transaction.Timestamp
            });

            return Ok(new
            {
                message      = "تم النقل بنجاح",
                blockNumber  = transaction.BlockNumber,
                blockHash    = transaction.BlockHash,
                previousHash = transaction.PreviousHash,
                nonce        = transaction.Nonce,
                merkleRoot   = transaction.MerkleRoot,
                actionType   = transaction.ActionType,
                difficulty   = BlockchainService.DIFFICULTY,
                from         = role,
                to           = allowedTransfers[role]
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/history/{drugId}
        //  Returns ALL lifecycle events for a specific drug.
        // ════════════════════════════════════════════════════════
        [HttpGet("history/{drugId}")]
        public IActionResult GetHistory(int drugId)
        {
            var history = _context.DrugTransactions
                .Where(t => t.DrugId == drugId)
                .OrderBy(t => t.BlockNumber)
                .Select(t => new {
                    t.Id, t.BlockNumber, t.DrugId, t.DrugName,
                    t.FromRole, t.FromUsername, t.ToRole, t.ToUsername,
                    t.Status, t.ActionType, t.QrIssuanceId,
                    t.Timestamp, t.BlockHash, t.PreviousHash, t.Nonce, t.MerkleRoot
                })
                .ToList();

            return Ok(history);
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/chain
        //  Full blockchain — all blocks, all action types.
        // ════════════════════════════════════════════════════════
        [HttpGet("chain")]
        public IActionResult GetChain()
        {
            var chain = _context.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .Select(t => new {
                    t.Id, t.BlockNumber, t.DrugId, t.DrugName,
                    t.FromRole, t.FromUsername, t.ToRole, t.ToUsername,
                    t.Status, t.ActionType, t.QrIssuanceId,
                    t.Timestamp, t.BlockHash, t.PreviousHash, t.Nonce, t.MerkleRoot
                })
                .ToList();

            return Ok(new
            {
                totalBlocks = chain.Count,
                difficulty  = BlockchainService.DIFFICULTY,
                chain
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/search
        //  Admin search with filters: actionType, drugId, drugName,
        //  fromDate, toDate, status, limit.
        // ════════════════════════════════════════════════════════
        [HttpGet("search")]
        [Authorize(Roles = "LedgerAdmin")]
        public IActionResult Search(
            [FromQuery] string? actionType = null,
            [FromQuery] int?    drugId     = null,
            [FromQuery] string? drugName   = null,
            [FromQuery] string? fromDate   = null,
            [FromQuery] string? toDate     = null,
            [FromQuery] string? status     = null,
            [FromQuery] int     limit      = 100)
        {
            var query = _context.DrugTransactions.AsQueryable();

            if (!string.IsNullOrEmpty(actionType) && actionType != "ALL")
                query = query.Where(t => t.ActionType == actionType);

            if (drugId.HasValue)
                query = query.Where(t => t.DrugId == drugId.Value);

            if (!string.IsNullOrEmpty(drugName))
                query = query.Where(t => t.DrugName.Contains(drugName));

            if (!string.IsNullOrEmpty(status) && status != "ALL")
                query = query.Where(t => t.Status == status);

            if (DateTime.TryParse(fromDate, out var fd))
                query = query.Where(t => t.Timestamp >= fd);

            if (DateTime.TryParse(toDate, out var td))
                query = query.Where(t => t.Timestamp <= td.AddDays(1));

            var results = query
                .OrderByDescending(t => t.BlockNumber)
                .Take(Math.Min(limit, 500))
                .Select(t => new {
                    t.Id, t.BlockNumber, t.DrugId, t.DrugName,
                    t.FromRole, t.FromUsername, t.ToRole, t.ToUsername,
                    t.Status, t.ActionType, t.QrIssuanceId,
                    t.Timestamp, t.BlockHash, t.PreviousHash, t.Nonce, t.MerkleRoot
                })
                .ToList();

            return Ok(new
            {
                total   = results.Count,
                results
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/stats
        //  Dashboard summary: total blocks, breakdown by ActionType,
        //  and the 10 most recent transactions.
        // ════════════════════════════════════════════════════════
        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            var all = _context.DrugTransactions.ToList();

            var byAction = new
            {
                drugRegistered = all.Count(t => t.ActionType == "DRUG_REGISTERED"),
                qrGenerated    = all.Count(t => t.ActionType == "QR_GENERATED"),
                transfer       = all.Count(t => t.ActionType == "TRANSFER"),
                customerScan   = all.Count(t => t.ActionType == "CUSTOMER_SCAN"),
            };

            var recent = all
                .OrderByDescending(t => t.BlockNumber)
                .Take(10)
                .Select(t => new {
                    t.Id, t.BlockNumber, t.DrugId, t.DrugName,
                    t.FromRole, t.ToRole,
                    t.Status, t.ActionType,
                    t.Timestamp, t.BlockHash
                })
                .ToList();

            return Ok(new
            {
                totalBlocks = all.Count,
                difficulty  = BlockchainService.DIFFICULTY,
                byAction,
                recent
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/verify-chain
        // ════════════════════════════════════════════════════════
        [HttpGet("verify-chain")]
        public IActionResult VerifyChain()
        {
            var chain = _context.DrugTransactions
                .OrderBy(t => t.BlockNumber)
                .ToList();

            if (chain.Count == 0)
                return Ok(new { valid = true, message = "✅ السلسلة فارغة", totalBlocks = 0 });

            var difficultyPrefix = new string('0', BlockchainService.DIFFICULTY);

            for (int i = 0; i < chain.Count; i++)
            {
                var block = chain[i];

                if (!block.BlockHash.StartsWith(difficultyPrefix))
                    return Ok(new
                    {
                        valid          = false,
                        tamperedBlock  = block.BlockNumber,
                        reason         = "Proof of Work",
                        message        = $"⚠️ Block #{block.BlockNumber} لا يحقق شرط Proof of Work"
                    });

                if (i > 0 && block.PreviousHash != chain[i - 1].BlockHash)
                    return Ok(new
                    {
                        valid          = false,
                        tamperedBlock  = block.BlockNumber,
                        reason         = "Hash Chain Broken",
                        message        = $"⚠️ انكسرت السلسلة عند Block #{block.BlockNumber}"
                    });

                var expectedMerkle = _blockchain.ComputeMerkleRoot(block);
                if (block.MerkleRoot != expectedMerkle)
                    return Ok(new
                    {
                        valid          = false,
                        tamperedBlock  = block.BlockNumber,
                        reason         = "Merkle Root Mismatch",
                        message        = $"⚠️ تم التلاعب ببيانات Block #{block.BlockNumber}"
                    });
            }

            return Ok(new
            {
                valid       = true,
                totalBlocks = chain.Count,
                difficulty  = BlockchainService.DIFFICULTY,
                message     = $"✅ السلسلة سليمة — {chain.Count} block تم التحقق منها بنجاح"
            });
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/transaction/nodes
        // ════════════════════════════════════════════════════════
        [HttpGet("nodes")]
        public IActionResult GetNodes()
        {
            return Ok(new
            {
                currentNode = "http://localhost:7036",
                peers       = _nodeSync.GetPeerNodes(),
                totalPeers  = _nodeSync.GetPeerNodes().Count
            });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/receive-block  (no auth — peer sync)
        // ════════════════════════════════════════════════════════
        [HttpPost("receive-block")]
        [AllowAnonymous]
        public IActionResult ReceiveBlock([FromBody] ReceivedBlockDto block)
        {
            return Ok(new { received = true, blockNumber = block.BlockNumber });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/demo-tamper/{blockId}  [Admin]
        // ════════════════════════════════════════════════════════
        [HttpPost("demo-tamper/{blockId}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DemoTamper(int blockId)
        {
            var block = _context.DrugTransactions.Find(blockId);
            if (block == null) return NotFound("Block غير موجود");

            block.ToUsername = "HACKED_" + block.ToUsername;
            _context.SaveChanges();

            return Ok(new
            {
                message     = $"⚠️ تم تعديل Block #{block.BlockNumber} — اضغط Verify لكشف التلاعب",
                blockNumber = block.BlockNumber,
                newUsername = block.ToUsername
            });
        }

        // ════════════════════════════════════════════════════════
        //  POST /api/transaction/demo-restore  [Admin]
        // ════════════════════════════════════════════════════════
        [HttpPost("demo-restore")]
        [Authorize(Roles = "Admin")]
        public IActionResult DemoRestore()
        {
            if (!System.IO.File.Exists(_chainFilePath))
                return NotFound("لا يوجد backup — قم بعمل transfer أولاً");

            var json  = System.IO.File.ReadAllText(_chainFilePath);
            var saved = JsonSerializer.Deserialize<List<ChainBackup>>(json);
            if (saved == null) return BadRequest("ملف الـ backup تالف");

            foreach (var backup in saved)
            {
                var block = _context.DrugTransactions.Find(backup.Id);
                if (block == null) continue;
                block.ToUsername  = backup.ToUsername;
                block.FromUsername = backup.FromUsername;
                block.BlockHash   = backup.BlockHash;
                block.MerkleRoot  = backup.MerkleRoot;
            }

            _context.SaveChanges();
            return Ok(new { message = "✅ تمت استعادة السلسلة من الـ Backup بنجاح" });
        }
    }

    // ════════════════════════════════════════════════════════
    //  DTOs
    // ════════════════════════════════════════════════════════
    public class TransferDto
    {
        public int    DrugId     { get; set; }
        public string ToUsername { get; set; } = string.Empty;
    }

    public class ReceivedBlockDto
    {
        public int      BlockNumber  { get; set; }
        public string   DrugName     { get; set; } = string.Empty;
        public string   FromRole     { get; set; } = string.Empty;
        public string   ToRole       { get; set; } = string.Empty;
        public string   ActionType   { get; set; } = "TRANSFER";
        public string   BlockHash    { get; set; } = string.Empty;
        public string   PreviousHash { get; set; } = string.Empty;
        public int      Nonce        { get; set; }
        public string   MerkleRoot   { get; set; } = string.Empty;
        public DateTime Timestamp    { get; set; }
    }

    public class ChainBackup
    {
        public int      Id           { get; set; }
        public int      BlockNumber  { get; set; }
        public int      DrugId       { get; set; }
        public string   DrugName     { get; set; } = string.Empty;
        public string   FromRole     { get; set; } = string.Empty;
        public string   FromUsername { get; set; } = string.Empty;
        public string   ToRole       { get; set; } = string.Empty;
        public string   ToUsername   { get; set; } = string.Empty;
        public string   Status       { get; set; } = string.Empty;
        public string   ActionType   { get; set; } = "TRANSFER";
        public int?     QrIssuanceId { get; set; }
        public DateTime Timestamp    { get; set; }
        public string   BlockHash    { get; set; } = string.Empty;
        public string   PreviousHash { get; set; } = string.Empty;
        public int      Nonce        { get; set; }
        public string   MerkleRoot   { get; set; } = string.Empty;
    }
}
