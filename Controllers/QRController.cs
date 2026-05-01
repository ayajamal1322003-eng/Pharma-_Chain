using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PharmaChain.Data;
using PharmaChain.Models;
using QRCoder;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QRController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public QRController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ══════════════════════════════════════════════════
        // GET /api/qr/{drugId}?token=...
        // Generates a time-bound, cryptographically signed QR Code
        // ══════════════════════════════════════════════════
        [HttpGet("{drugId}")]
        public IActionResult GenerateQR(int drugId, [FromQuery] string token)
        {
            // ── 1. Validate JWT ──
            if (string.IsNullOrEmpty(token))
                return Unauthorized("Token مطلوب");

            try
            {
                var key = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
                var handler = new JwtSecurityTokenHandler();
                handler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = key,
                    ValidateIssuer = true,
                    ValidIssuer = _config["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _config["Jwt:Audience"],
                    ValidateLifetime = true
                }, out _);
            }
            catch
            {
                return Unauthorized("Token غير صحيح");
            }

            // ── 2. Load drug ──
            var drug = _context.Drugs.Find(drugId);
            if (drug == null) return NotFound("الدواء غير موجود");

            // ── 3. Build signed payload ──
            var productionDate = drug.CreatedAt.ToString("yyyy-MM-dd");
            var generatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var signature = ComputeHmac(drugId, productionDate, generatedAt);

            var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:7036";
            var verifyUrl =
                $"{baseUrl}/verify.html" +
                $"?id={drugId}" +
                $"&prod={Uri.EscapeDataString(productionDate)}" +
                $"&ts={generatedAt}" +
                $"&sig={Uri.EscapeDataString(signature)}";

            // ── 4. Generate QR image ──
            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(verifyUrl, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrData);
            var qrBytes = qrCode.GetGraphic(10);

            return File(qrBytes, "image/png");
        }

        // ══════════════════════════════════════════════════
        // GET /api/qr/verify-signature?id=&prod=&ts=&sig=
        // Validates QR authenticity + يسجل كل محاولة في QrScanLogs
        // ══════════════════════════════════════════════════
        [HttpGet("verify-signature")]
        public IActionResult VerifySignature(
            [FromQuery] int id,
            [FromQuery] string prod,
            [FromQuery] string ts,
            [FromQuery] string sig)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // ── بيانات ناقصة ──
            if (string.IsNullOrEmpty(prod) || string.IsNullOrEmpty(ts) || string.IsNullOrEmpty(sig))
            {
                SaveLog(id, prod ?? "", ts ?? "", false, "MISSING_PARAMS",
                    "QR Code is incomplete — possible label tampering detected.", ip);

                return BadRequest(new
                {
                    isValid = false,
                    attackType = "MISSING_PARAMS",
                    message = "QR Code is incomplete — possible label tampering detected."
                });
            }

            // ── الدواء مش موجود ──
            var drug = _context.Drugs.Find(id);
            if (drug == null)
            {
                SaveLog(id, prod, ts, false, "DRUG_NOT_FOUND",
                    "Drug ID not found. QR code may be counterfeit.", ip);

                return Ok(new
                {
                    isValid = false,
                    attackType = "DRUG_NOT_FOUND",
                    message = "Drug ID not found in system. QR code may be counterfeit."
                });
            }

            // ── Signature مش صح ──
            var expectedSig = ComputeHmac(id, prod, ts);
            if (!CryptographicEquals(expectedSig, sig))
            {
                SaveLog(id, prod, ts, false, "SIGNATURE_MISMATCH",
                    $"Invalid signature for drug {id}. Label substitution attack suspected.", ip);

                return Ok(new
                {
                    isValid = false,
                    attackType = "SIGNATURE_MISMATCH",
                    message = "QR Code signature is invalid. This product may have been tampered with or its label substituted."
                });
            }

            // ── تاريخ الإنتاج مش مطابق ──
            var dbProductionDate = drug.CreatedAt.ToString("yyyy-MM-dd");
            if (dbProductionDate != prod)
            {
                SaveLog(id, prod, ts, false, "DATE_MISMATCH",
                    $"QR date ({prod}) != DB date ({dbProductionDate}). Date-based attack detected.", ip);

                return Ok(new
                {
                    isValid = false,
                    attackType = "DATE_MISMATCH",
                    message = "Production date in QR does not match database record.",
                    qrDate = prod,
                    databaseDate = dbProductionDate,
                    detail = "Date-based attack detected: QR label was likely copied from a different batch."
                });
            }

            // ── QR منتهي الصلاحية ──
            if (long.TryParse(ts, out var tsLong))
            {
                var generated = DateTimeOffset.FromUnixTimeSeconds(tsLong);
                var age = DateTimeOffset.UtcNow - generated;
                if (age.TotalDays > 365)
                {
                    SaveLog(id, prod, ts, false, "QR_EXPIRED",
                        $"QR expired — generated {(int)age.TotalDays} days ago.", ip);

                    return Ok(new
                    {
                        isValid = false,
                        attackType = "QR_EXPIRED",
                        message = $"This QR Code was generated {(int)age.TotalDays} days ago and has expired.",
                        generatedAt = generated.ToString("yyyy-MM-dd HH:mm:ss UTC")
                    });
                }
            }

            // ── كل الفحوصات نجحت ──
            SaveLog(id, prod, ts, true, "NONE", "QR verified successfully.", ip);

            return Ok(new
            {
                isValid = true,
                attackType = "NONE",
                message = "QR Code is authentic and verified.",
                drugId = id,
                drugName = drug.Name,
                manufacturer = drug.Manufacturer,
                productionDate = prod,
                generatedAt = DateTimeOffset.FromUnixTimeSeconds(long.Parse(ts))
                                               .ToString("yyyy-MM-dd HH:mm:ss UTC"),
                expiryDate = drug.ExpiryDate.ToString("yyyy-MM-dd")
            });
        }

        // ══════════════════════════════════════════════════
        // GET /api/qr/scan-logs
        // يرجع آخر 100 عملية مسح — للأدمن فقط
        // ══════════════════════════════════════════════════
        [HttpGet("scan-logs")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetScanLogs(
            [FromQuery] string? attackType = null,
            [FromQuery] int limit = 100)
        {
            var query = _context.QrScanLogs.AsQueryable();

            // فلتر حسب نوع الهجوم إذا محدد
            if (!string.IsNullOrEmpty(attackType) && attackType != "ALL")
                query = query.Where(l => l.AttackType == attackType);

            var logs = query
                .OrderByDescending(l => l.ScannedAt)
                .Take(limit)
                .Select(l => new
                {
                    l.Id,
                    l.DrugId,
                    l.IsValid,
                    l.AttackType,
                    l.Message,
                    l.IpAddress,
                    scannedAt = l.ScannedAt.ToString("yyyy-MM-dd HH:mm:ss")
                })
                .ToList();

            // إحصائيات سريعة
            var stats = new
            {
                total = _context.QrScanLogs.Count(),
                valid = _context.QrScanLogs.Count(l => l.IsValid),
                signatureMismatch = _context.QrScanLogs.Count(l => l.AttackType == "SIGNATURE_MISMATCH"),
                dateMismatch = _context.QrScanLogs.Count(l => l.AttackType == "DATE_MISMATCH"),
                drugNotFound = _context.QrScanLogs.Count(l => l.AttackType == "DRUG_NOT_FOUND"),
                qrExpired = _context.QrScanLogs.Count(l => l.AttackType == "QR_EXPIRED"),
            };

            return Ok(new { stats, logs });
        }

        // ══════════════════════════════════════════════════
        // Helper: حفظ كل عملية مسح في الـ DB
        // ══════════════════════════════════════════════════
        private void SaveLog(int drugId, string prod, string ts,
                             bool isValid, string attackType, string message, string ip)
        {
            _context.QrScanLogs.Add(new QrScanLog
            {
                DrugId = drugId,
                ProductionDate = prod,
                Timestamp = ts,
                IsValid = isValid,
                AttackType = attackType,
                Message = message,
                IpAddress = ip,
                ScannedAt = DateTime.UtcNow
            });
            _context.SaveChanges();
        }

        // ══════════════════════════════════════════════════
        // HMAC-SHA256 Signature
        // ══════════════════════════════════════════════════
        private string ComputeHmac(int drugId, string productionDate, string timestamp)
        {
            var secret = _config["Jwt:Key"] ?? "PharmaChainSecretKey";
            var payload = $"{drugId}|{productionDate}|{timestamp}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return Convert.ToHexString(hash)[..32];
        }

        // Constant-time comparison to prevent timing attacks
        private static bool CryptographicEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            var result = 0;
            for (int i = 0; i < a.Length; i++)
                result |= a[i] ^ b[i];
            return result == 0;
        }
    }
}