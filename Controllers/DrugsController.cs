using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using PharmaChain.Data;
using PharmaChain.Models;
using PharmaChain.Services;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DrugsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly AiTokenService _aiTokenService;
        private readonly BlockchainService _blockchain;
        private readonly IConfiguration _config;

        public DrugsController(AppDbContext context, AiTokenService aiTokenService,
                                BlockchainService blockchain, IConfiguration config)
        {
            _context        = context;
            _aiTokenService = aiTokenService;
            _blockchain     = blockchain;
            _config         = config;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var drugs = _context.Drugs.ToList();
                var tamperedDrugs = new List<string>();

                foreach (var drug in drugs)
                {
                    if (string.IsNullOrEmpty(drug.Checksum)) continue;
                    var expected = ComputeChecksum(drug);
                    if (drug.Checksum != expected)
                        tamperedDrugs.Add(drug.Name);
                }

                if (tamperedDrugs.Any())
                {
                    _context.AuditLogs.Add(new AuditLog
                    {
                        UserId = 0,
                        Username = "SYSTEM",
                        Action = "TamperDetected",
                        Details = "تم اكتشاف تلاعب في: " + string.Join(", ", tamperedDrugs),
                        Timestamp = DateTime.UtcNow,
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                    });
                    _context.SaveChanges();

                    return Ok(new
                    {
                        drugs,
                        securityAlert = "تم اكتشاف تلاعب في بيانات " + tamperedDrugs.Count + " دواء",
                        tamperedDrugs
                    });
                }

                return Ok(drugs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        [HttpPost]
        [Authorize(Roles = "Factory,Admin")]
        public async Task<IActionResult> AddDrug([FromBody] Drug drug)
        {
            try
            {
                // ── Validation ──
                if (string.IsNullOrWhiteSpace(drug.Name) ||
                    string.IsNullOrWhiteSpace(drug.BatchNumber) ||
                    string.IsNullOrWhiteSpace(drug.Manufacturer))
                    return BadRequest("جميع الحقول مطلوبة");

                if (drug.Name.Length > 100)
                    return BadRequest("اسم الدواء طويل جداً — الحد الأقصى 100 حرف");

                if (drug.Quantity <= 0)
                    return BadRequest("الكمية يجب أن تكون أكبر من صفر");

                if (drug.ExpiryDate <= DateTime.UtcNow)
                    return BadRequest("لا يمكن إضافة دواء منتهي الصلاحية");

                // ── ManufactureDate validation ──
                if (drug.ManufactureDate == default || drug.ManufactureDate == DateTime.MinValue)
                    drug.ManufactureDate = DateTime.UtcNow.Date;
                if (drug.ManufactureDate > DateTime.UtcNow.AddDays(1))
                    return BadRequest("تاريخ الإنتاج لا يمكن أن يكون في المستقبل");
                if (drug.ManufactureDate >= drug.ExpiryDate)
                    return BadRequest("تاريخ الإنتاج يجب أن يكون قبل تاريخ انتهاء الصلاحية");

                // ── Sanitize ──
                drug.Name         = System.Net.WebUtility.HtmlEncode(drug.Name.Trim());
                drug.Manufacturer = System.Net.WebUtility.HtmlEncode(drug.Manufacturer.Trim());

                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
                var role     = User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

                var rawBatch    = drug.BatchNumber;
                drug.BatchNumber = HashBatchNumber(drug.BatchNumber);
                drug.AddedByRole = role;
                drug.CreatedAt   = DateTime.UtcNow;
                drug.Checksum    = string.Empty;
                drug.AiToken     = string.Empty;

                // ── Save first to get ID ──
                _context.Drugs.Add(drug);
                _context.SaveChanges();

                // ── Generate AI Token (async — بعد ما عندنا الـ ID) ──
                drug.AiToken = await _aiTokenService.GenerateUniqueTokenAsync(
                    drug.Name,
                    drug.Manufacturer,
                    drug.BatchNumber,
                    drug.ExpiryDate,
                    drug.Quantity
                );

                // ── Compute Checksum (بعد ما عندنا كل البيانات) ──
                drug.Checksum = ComputeChecksum(drug);
                _context.SaveChanges();

                // ── Audit Log ──
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId    = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                    Username  = username,
                    Action    = "AddDrug",
                    Details   = $"تم إضافة دواء: {drug.Name} | الكمية: {drug.Quantity} | AI Token: {drug.AiToken[..8]}...",
                    Timestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                });

                // ── Blockchain: DRUG_REGISTERED ──
                _blockchain.CreateTransaction(
                    drug.Id, drug.Name,
                    fromRole: "SYSTEM", fromUsername: "SYSTEM",
                    toRole: role, toUsername: username,
                    status: "Registered", actionType: "DRUG_REGISTERED"
                );
                _context.SaveChanges();
                _blockchain.SaveChainToJson();

                // ── Build QR URL to return ──
                var prodDate  = drug.CreatedAt.ToString("yyyy-MM-dd");
                var ts        = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                var baseUrl   = _config["App:BaseUrl"] ?? "http://localhost:7036";
                var qrUrl     = $"{baseUrl}/verify.html?id={drug.Id}&prod={Uri.EscapeDataString(prodDate)}&ts={ts}";

                return Ok(new
                {
                    message  = "تم إضافة الدواء بنجاح",
                    id       = drug.Id,
                    name     = drug.Name,
                    aiToken  = drug.AiToken,
                    aiMethod = IsAiKeyConfigured() ? "Claude AI (claude-haiku-4-5)" : "Crypto Fallback (SHA-256 + GUID)",
                    qrBaseUrl = qrUrl
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public IActionResult DeleteDrug(int id)
        {
            try
            {
                var drug = _context.Drugs.Find(id);
                if (drug == null) return NotFound("الدواء غير موجود");

                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

                _context.Drugs.Remove(drug);
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId    = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0"),
                    Username  = username,
                    Action    = "DeleteDrug",
                    Details   = "تم حذف دواء: " + drug.Name,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown"
                });
                _context.SaveChanges();

                return Ok(new { message = "تم الحذف بنجاح" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "خطأ: " + ex.Message);
            }
        }

        private bool IsAiKeyConfigured()
        {
            var key = _config["Anthropic:ApiKey"] ?? "";
            return !string.IsNullOrWhiteSpace(key) && !key.StartsWith("YOUR_");
        }

        private static string HashBatchNumber(string batchNumber)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(batchNumber));
            return Convert.ToHexString(bytes)[..16];
        }

        private static string ComputeChecksum(Drug drug)
        {
            // ManufactureDate + ExpiryDate included so tampering with dates breaks checksum
            var data = drug.Id + drug.Name + drug.BatchNumber +
                       drug.ManufactureDate.ToString("yyyy-MM-dd") +
                       drug.ExpiryDate.ToString("yyyy-MM-dd") +
                       drug.Manufacturer + drug.Quantity + drug.AiToken;
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(bytes)[..16];
        }
    }
}
