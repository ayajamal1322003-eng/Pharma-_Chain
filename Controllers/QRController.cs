using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PharmaChain.Data;
using PharmaChain.Models;
using PharmaChain.Services;
using QRCoder;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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
        private readonly BlockchainService _blockchain;

        private static readonly Dictionary<string, int> DefaultQuotas = new(StringComparer.OrdinalIgnoreCase)
        {
            { "Factory",      500  },
            { "Distributor",  200  },
            { "Pharmacy",     100  },
            { "Admin",        9999 },
            { "LedgerAdmin",  9999 }
        };

        public QRController(AppDbContext context, IConfiguration config, BlockchainService blockchain)
        {
            _context    = context;
            _config     = config;
            _blockchain = blockchain;
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/{drugId}?token=...
        // Generates a time-bound, cryptographically signed QR Code.
        // Enforces per-role quota; records every issuance on the ledger.
        // ══════════════════════════════════════════════════════════════
        [HttpGet("{drugId}")]
        public IActionResult GenerateQR(int drugId, [FromQuery] string token)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // 1. Validate JWT
            if (string.IsNullOrEmpty(token))
                return Unauthorized("Token مطلوب");

            ClaimsPrincipal principal;
            try
            {
                var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
                var handler = new JwtSecurityTokenHandler();
                principal   = handler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = key,
                    ValidateIssuer           = true,
                    ValidIssuer              = _config["Jwt:Issuer"],
                    ValidateAudience         = true,
                    ValidAudience            = _config["Jwt:Audience"],
                    ValidateLifetime         = true
                }, out _);
            }
            catch { return Unauthorized("Token غير صحيح"); }

            var userIdStr = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0";
            var username  = principal.FindFirstValue(ClaimTypes.Name)           ?? "unknown";
            var role      = principal.FindFirstValue(ClaimTypes.Role)           ?? "Unknown";
            int.TryParse(userIdStr, out var userId);

            // 2. Load drug
            var drug = _context.Drugs.Find(drugId);
            if (drug == null) return NotFound("الدواء غير موجود");

            // 3a. Inventory guard: cannot issue more QR codes than the drug's registered quantity.
            //     This blocks the "Inventory Manipulation Attack" — attacker tries to generate
            //     QR codes beyond the registered stock, fabricating phantom units.
            var qrIssuedForDrug    = _context.DrugTransactions
                .Count(t => t.DrugId == drugId && t.ActionType == "QR_GENERATED" && t.Status == "Issued");
            var customerScansForDrug = _context.DrugTransactions
                .Count(t => t.DrugId == drugId && t.ActionType == "CUSTOMER_SCAN");

            if (qrIssuedForDrug >= drug.Quantity)
            {
                var unconsumedUnits = Math.Max(0, qrIssuedForDrug - customerScansForDrug);

                // Record this violation as an ATTACK_DETECTED block in the immutable ledger
                _blockchain.CreateTransaction(
                    drugId, drug.Name,
                    fromRole: role,    fromUsername: username,
                    toRole: "System",  toUsername: "INVENTORY_GUARD",
                    status: "ATTACK_DETECTED", actionType: "ATTACK_DETECTED"
                );
                _context.SaveChanges();
                _blockchain.SaveChainToJson();

                return StatusCode(409, new
                {
                    blocked          = true,
                    attackType       = "INVENTORY_EXCEEDED",
                    message          = $"محاولة تجاوز الكمية المسجلة! الكمية ({drug.Quantity} وحدة) استُنفدت في السجل.",
                    registeredQty    = drug.Quantity,
                    qrIssued         = qrIssuedForDrug,
                    customerScans    = customerScansForDrug,
                    unconsumedUnits,
                    detail           = $"الدواء '{drug.Name}' يحتوي على {drug.Quantity} وحدة مسجلة. " +
                                       $"تم إصدار {qrIssuedForDrug} QR codes. " +
                                       $"{unconsumedUnits} وحدة لم تُصرف للمستخدمين بعد. " +
                                       $"لا يمكن إصدار QR جديد حتى تُثبت السجلات صرف الكميات السابقة.",
                    blockchainRecorded = true
                });
            }

            // 3. Quota enforcement
            var quota  = GetOrCreateQuota(role, username);
            var status = "Valid";
            string? suspicionReason = null;

            if (quota.IssuedCount >= quota.QuotaLimit)
            {
                RecordIssuance(drugId, drug.Name, userId, username, role, quota,
                               "Blocked",
                               $"Quota exceeded: {quota.IssuedCount}/{quota.QuotaLimit} for period {quota.PeriodStart:yyyy-MM-dd} → {quota.PeriodEnd:yyyy-MM-dd}",
                               "", ip);
                _context.SaveChanges();

                return StatusCode(429, new
                {
                    blocked   = true,
                    message   = $"QR quota exceeded. You have issued {quota.IssuedCount} of {quota.QuotaLimit} allowed QR codes this period.",
                    issued    = quota.IssuedCount,
                    limit     = quota.QuotaLimit,
                    periodEnd = quota.PeriodEnd.ToString("yyyy-MM-dd"),
                    role
                });
            }

            // Burst detection: >10 QR from same user in last 60 seconds
            var recentCount = _context.QrIssuances
                .Count(q => q.UserId == userId && q.IssuedAt >= DateTime.UtcNow.AddSeconds(-60));
            if (recentCount >= 10)
            {
                status          = "Suspicious";
                suspicionReason = $"Burst detected: {recentCount + 1} QR codes generated within 60 seconds by {username}.";
            }

            // 4. Build signed payload — mathematically binds all three dates
            var mfgDate    = drug.ManufactureDate.ToString("yyyy-MM-dd");
            var expDate    = drug.ExpiryDate.ToString("yyyy-MM-dd");
            var generatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            // HMAC payload: drugId | manufactureDate | expiryDate | timestamp | aiToken
            var signature  = ComputeHmac(drugId, mfgDate, expDate, generatedAt, drug.AiToken);

            // 5. Increment quota & record issuance
            quota.IssuedCount++;
            quota.UpdatedAt = DateTime.UtcNow;
            var issuance = RecordIssuance(drugId, drug.Name, userId, username, role,
                                          quota, status, suspicionReason, signature[..16], ip);
            _context.SaveChanges();
            // issuance.Id is now populated after SaveChanges

            // 6. Blockchain: QR_GENERATED
            _blockchain.CreateTransaction(
                drugId, drug.Name,
                fromRole: role,       fromUsername: username,
                toRole:   "Customer", toUsername:   "QR-Recipient",
                status:   status == "Blocked" ? "Blocked" : "Issued",
                actionType: "QR_GENERATED",
                qrIssuanceId: issuance.Id
            );
            _context.SaveChanges();
            _blockchain.SaveChainToJson();

            // 7. Build QR URL — all three dates embedded in URL + HMAC
            var baseUrl   = _config["App:BaseUrl"] ?? "http://localhost:7036";
            var verifyUrl = $"{baseUrl}/verify.html"
                          + $"?id={drugId}"
                          + $"&mfg={Uri.EscapeDataString(mfgDate)}"
                          + $"&exp={Uri.EscapeDataString(expDate)}"
                          + $"&ts={generatedAt}"
                          + $"&sig={Uri.EscapeDataString(signature)}";

            // 8. Generate QR image
            using var qrGenerator = new QRCodeGenerator();
            var qrData  = qrGenerator.CreateQrCode(verifyUrl, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrData);
            var qrBytes = qrCode.GetGraphic(10);

            Response.Headers["X-QR-Sequence"]  = quota.IssuedCount.ToString();
            Response.Headers["X-QR-Remaining"] = (quota.QuotaLimit - quota.IssuedCount).ToString();
            Response.Headers["X-QR-Status"]    = status;
            Response.Headers["X-Block-Hash"]   = _context.DrugTransactions
                                                     .OrderByDescending(t => t.BlockNumber)
                                                     .Select(t => t.BlockHash)
                                                     .FirstOrDefault() ?? "";

            return File(qrBytes, "image/png");
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/verify-signature
        //   New format : ?id=&mfg=&exp=&ts=&sig=
        //   Legacy     : ?id=&prod=&ts=&sig=   (backward-compatible)
        //
        // Three-date mathematical binding (new format):
        //   HMAC = SHA256( drugId | mfgDate | expDate | timestamp | aiToken )
        //   • mfg  = تاريخ إنتاج الدواء  — must match DB ManufactureDate
        //   • exp  = تاريخ انتهاء الصلاحية — must match DB ExpiryDate (QR expiry = drug expiry)
        //   • ts   = وقت إصدار الـ QR     — prevents replay after 365 days
        // ══════════════════════════════════════════════════════════════
        [HttpGet("verify-signature")]
        public IActionResult VerifySignature(
            [FromQuery] int     id,
            [FromQuery] string? mfg  = null,   // تاريخ الإنتاج (new)
            [FromQuery] string? prod = null,   // legacy alias for mfg
            [FromQuery] string? exp  = null,   // تاريخ انتهاء الصلاحية (new)
            [FromQuery] string  ts   = "",
            [FromQuery] string  sig  = "")
        {
            var ip       = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var mfgParam = mfg ?? prod ?? "";
            var expParam = exp ?? "";
            bool isNewFormat = !string.IsNullOrEmpty(expParam);

            // ── 1. Missing params ──
            if (string.IsNullOrEmpty(mfgParam) || string.IsNullOrEmpty(ts) || string.IsNullOrEmpty(sig))
            {
                SaveLog(id, mfgParam, ts, false, "MISSING_PARAMS",
                    "QR Code is incomplete — possible label tampering detected.", ip);
                return BadRequest(new
                {
                    isValid    = false,
                    attackType = "MISSING_PARAMS",
                    message    = "QR Code is incomplete — possible label tampering detected."
                });
            }

            // ── 2. Drug exists ──
            var drug = _context.Drugs.Find(id);
            if (drug == null)
            {
                SaveLog(id, mfgParam, ts, false, "DRUG_NOT_FOUND",
                    "Drug ID not found. QR code may be counterfeit.", ip);
                return Ok(new { isValid = false, attackType = "DRUG_NOT_FOUND",
                    message = "Drug ID not found in system. QR code may be counterfeit." });
            }

            // ── 3. HMAC verification (new format vs legacy) ──
            string expectedSig = isNewFormat
                ? ComputeHmac(id, mfgParam, expParam, ts, drug.AiToken)
                : ComputeHmacLegacy(id, mfgParam, ts, drug.AiToken);

            if (!CryptographicEquals(expectedSig, sig))
            {
                SaveLog(id, mfgParam, ts, false, "SIGNATURE_MISMATCH",
                    $"Invalid signature for drug {id}. Label substitution attack suspected.", ip);
                return Ok(new { isValid = false, attackType = "SIGNATURE_MISMATCH",
                    message = "QR Code signature is invalid. This product may have been tampered with or its label substituted." });
            }

            if (isNewFormat)
            {
                // ── 4a. Manufacture date check ──
                var dbMfg = drug.ManufactureDate.ToString("yyyy-MM-dd");
                if (dbMfg != mfgParam)
                {
                    SaveLog(id, mfgParam, ts, false, "MFG_DATE_MISMATCH",
                        $"QR manufacture date ({mfgParam}) ≠ DB ({dbMfg}).", ip);
                    return Ok(new { isValid = false, attackType = "MFG_DATE_MISMATCH",
                        message    = "Manufacture date in QR does not match the database record.",
                        qrDate     = mfgParam,
                        dbDate     = dbMfg,
                        detail     = "The manufacture date embedded in the QR has been altered." });
                }

                // ── 4b. Expiry date check ──
                var dbExp = drug.ExpiryDate.ToString("yyyy-MM-dd");
                if (dbExp != expParam)
                {
                    SaveLog(id, mfgParam, ts, false, "EXPIRY_MISMATCH",
                        $"QR expiry ({expParam}) ≠ DB ({dbExp}).", ip);
                    return Ok(new { isValid = false, attackType = "EXPIRY_MISMATCH",
                        message    = "Expiry date in QR does not match the database record.",
                        qrExpiry   = expParam,
                        dbExpiry   = dbExp,
                        detail     = "The expiry date in the QR has been altered — possible forgery." });
                }

                // ── 4c. Drug / QR expired (QR expiry = drug expiry) ──
                if (drug.ExpiryDate < DateTime.UtcNow)
                {
                    var daysExpired = (int)(DateTime.UtcNow - drug.ExpiryDate).TotalDays;
                    SaveLog(id, mfgParam, ts, false, "DRUG_EXPIRED",
                        $"Drug expired {daysExpired} day(s) ago on {drug.ExpiryDate:yyyy-MM-dd}. QR also invalid.", ip);
                    return Ok(new { isValid = false, attackType = "DRUG_EXPIRED",
                        message     = $"This drug expired {daysExpired} day(s) ago. The QR Code is also no longer valid.",
                        expiryDate  = drug.ExpiryDate.ToString("yyyy-MM-dd"),
                        qrExpiryDate = drug.ExpiryDate.ToString("yyyy-MM-dd"),
                        detail      = "QR Code validity is bound to the drug expiry date." });
                }
            }
            else
            {
                // ── Legacy: check CreatedAt date only ──
                var dbLegacyDate = drug.CreatedAt.ToString("yyyy-MM-dd");
                if (dbLegacyDate != mfgParam)
                {
                    SaveLog(id, mfgParam, ts, false, "DATE_MISMATCH",
                        $"QR date ({mfgParam}) != DB date ({dbLegacyDate}). Date-based attack detected.", ip);
                    return Ok(new { isValid = false, attackType = "DATE_MISMATCH",
                        message      = "Production date in QR does not match database record.",
                        qrDate       = mfgParam,
                        databaseDate = dbLegacyDate,
                        detail       = "Date-based attack detected: QR label was likely copied from a different batch." });
                }
                // Also check drug expiry for legacy codes
                if (drug.ExpiryDate < DateTime.UtcNow)
                {
                    var daysExpired = (int)(DateTime.UtcNow - drug.ExpiryDate).TotalDays;
                    SaveLog(id, mfgParam, ts, false, "DRUG_EXPIRED",
                        $"Drug expired {daysExpired} day(s) ago.", ip);
                    return Ok(new { isValid = false, attackType = "DRUG_EXPIRED",
                        message    = $"This drug expired {daysExpired} day(s) ago. The QR Code is no longer valid.",
                        expiryDate = drug.ExpiryDate.ToString("yyyy-MM-dd") });
                }
            }

            // ── 5. QR age check (>365 days old regardless of format) ──
            if (long.TryParse(ts, out var tsLong))
            {
                var generated = DateTimeOffset.FromUnixTimeSeconds(tsLong);
                var age       = DateTimeOffset.UtcNow - generated;
                if (age.TotalDays > 365)
                {
                    SaveLog(id, mfgParam, ts, false, "QR_EXPIRED",
                        $"QR expired — generated {(int)age.TotalDays} days ago.", ip);
                    return Ok(new { isValid = false, attackType = "QR_EXPIRED",
                        message     = $"This QR Code was generated {(int)age.TotalDays} days ago and has expired.",
                        generatedAt = generated.ToString("yyyy-MM-dd HH:mm:ss UTC") });
                }
            }

            // ── 6. Quota / issuance anomaly check ──
            var sigPrefix = sig.Length >= 16 ? sig[..16] : sig;
            var issuance  = _context.QrIssuances
                .Where(q => q.DrugId == id && q.Signature == sigPrefix)
                .OrderByDescending(q => q.IssuedAt)
                .FirstOrDefault();

            string quotaNote = "";
            if (issuance != null && issuance.Status == "Blocked")
            {
                SaveLog(id, mfgParam, ts, false, "QUOTA_EXCEEDED",
                    "QR was generated after quota was exceeded. Possible forgery.", ip);
                return Ok(new { isValid = false, attackType = "QUOTA_EXCEEDED",
                    message = "This QR code was generated outside the authorized issuance quota and is flagged as suspicious.",
                    detail  = issuance.SuspicionReason });
            }
            if (issuance != null && issuance.Status == "Suspicious")
                quotaNote = $" ⚠️ Issuance #{issuance.SequenceNumber}/{issuance.QuotaLimit} was flagged: {issuance.SuspicionReason}";

            // ── 6b. Duplicate QR scan check (Replay / Reuse Attack) ──
            //   Each QR is uniquely identified by (DrugId + generation timestamp).
            //   If a previous valid scan exists with the same ts, this is a replay attempt.
            var previousValidScan = _context.QrScanLogs
                .Where(l => l.DrugId == id && l.Timestamp == ts && l.IsValid && l.AttackType == "NONE")
                .OrderBy(l => l.ScannedAt)
                .FirstOrDefault();

            if (previousValidScan != null)
            {
                SaveLog(id, mfgParam, ts, false, "DUPLICATE_QR",
                    $"QR Code reuse attempt detected — first dispensed on " +
                    $"{previousValidScan.ScannedAt:yyyy-MM-dd HH:mm:ss} UTC by IP {previousValidScan.IpAddress}.", ip);

                // Record attack attempt as immutable block in the ledger
                _blockchain.CreateTransaction(
                    id, drug.Name,
                    fromRole: "ATTACKER",  fromUsername: ip,
                    toRole: "System",      toUsername: "DUPLICATE_QR_BLOCKED",
                    status: "ATTACK_DETECTED", actionType: "ATTACK_DETECTED"
                );
                _context.SaveChanges();
                _blockchain.SaveChainToJson();

                return Ok(new
                {
                    isValid      = false,
                    attackType   = "DUPLICATE_QR",
                    message      = "هذا الـ QR Code تم استخدامه مسبقاً — محاولة الإعادة مرفوضة ومسجلة في الـ Blockchain.",
                    firstScanned = previousValidScan.ScannedAt.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    firstScanIp  = previousValidScan.IpAddress,
                    detail       = "Each QR Code is single-use only. Replay/reuse attacks are detected " +
                                   "via the immutable scan log and recorded as ATTACK_DETECTED blocks on the ledger.",
                    blockchainRecorded = true
                });
            }

            // ── 7. Successful verification ──
            SaveLog(id, mfgParam, ts, true, "NONE", "QR verified successfully." + quotaNote, ip);

            _blockchain.CreateTransaction(
                id, drug.Name,
                fromRole: "Customer", fromUsername: ip,
                toRole:   "Customer", toUsername:   ip,
                status:   "Verified", actionType:   "CUSTOMER_SCAN"
            );
            _context.SaveChanges();
            _blockchain.SaveChainToJson();

            long.TryParse(ts, out var tsGen);
            return Ok(new
            {
                isValid          = true,
                attackType       = "NONE",
                message          = "QR Code is authentic and verified.",
                isNewFormat      = isNewFormat,
                drugId           = id,
                drugName         = drug.Name,
                manufacturer     = drug.Manufacturer,
                manufactureDate  = drug.ManufactureDate.ToString("yyyy-MM-dd"),
                expiryDate       = drug.ExpiryDate.ToString("yyyy-MM-dd"),
                qrExpiryDate     = drug.ExpiryDate.ToString("yyyy-MM-dd"),   // QR expires = drug expires
                generatedAt      = tsGen > 0
                                    ? DateTimeOffset.FromUnixTimeSeconds(tsGen).ToString("yyyy-MM-dd HH:mm:ss UTC")
                                    : "",
                aiToken          = string.IsNullOrEmpty(drug.AiToken) ? null : drug.AiToken[..8] + "...",
                aiSecured        = !string.IsNullOrEmpty(drug.AiToken),
                issuanceSeq      = issuance?.SequenceNumber,
                issuanceStatus   = issuance?.Status ?? "Unknown",
                quotaWarning     = issuance?.Status == "Suspicious" ? issuance.SuspicionReason : null,
                blockchainRecorded = true
            });
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/quota  — current user's quota status
        // ══════════════════════════════════════════════════════════════
        [HttpGet("quota")]
        [Authorize]
        public IActionResult GetMyQuota()
        {
            var username = User.FindFirstValue(ClaimTypes.Name) ?? "";
            var role     = User.FindFirstValue(ClaimTypes.Role) ?? "";

            var quota  = GetOrCreateQuota(role, username);
            var recent = _context.QrIssuances
                .Where(q => q.Username == username && q.IssuedAt >= quota.PeriodStart)
                .OrderByDescending(q => q.IssuedAt)
                .Take(5)
                .Select(q => new
                {
                    q.Id, q.DrugId, q.DrugName, q.SequenceNumber,
                    q.Status, q.SuspicionReason,
                    issuedAt = q.IssuedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList();

            return Ok(new
            {
                role,
                username,
                quotaId     = quota.Id,
                limit       = quota.QuotaLimit,
                issued      = quota.IssuedCount,
                remaining   = Math.Max(0, quota.QuotaLimit - quota.IssuedCount),
                usedPct     = quota.QuotaLimit > 0
                                ? Math.Round(quota.IssuedCount * 100.0 / quota.QuotaLimit, 1)
                                : 0,
                periodType  = quota.PeriodType,
                periodStart = quota.PeriodStart.ToString("yyyy-MM-dd"),
                periodEnd   = quota.PeriodEnd.ToString("yyyy-MM-dd"),
                recentIssued = recent
            });
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/quota/all  — all quotas overview [Admin]
        // ══════════════════════════════════════════════════════════════
        [HttpGet("quota/all")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetAllQuotas()
        {
            var now    = DateTime.UtcNow;
            var quotas = _context.QrQuotas
                .Where(q => q.IsActive && q.PeriodStart <= now && q.PeriodEnd > now)
                .OrderBy(q => q.Role).ThenBy(q => q.Username)
                .Select(q => new
                {
                    q.Id, q.Role, q.Username,
                    q.QuotaLimit, q.IssuedCount,
                    remaining = Math.Max(0, q.QuotaLimit - q.IssuedCount),
                    usedPct   = q.QuotaLimit > 0 ? Math.Round(q.IssuedCount * 100.0 / q.QuotaLimit, 1) : 0,
                    q.PeriodType,
                    periodStart = q.PeriodStart.ToString("yyyy-MM-dd"),
                    periodEnd   = q.PeriodEnd.ToString("yyyy-MM-dd"),
                    q.UpdatedAt
                }).ToList();

            var flagged = _context.QrIssuances
                .Where(q => q.Status != "Valid")
                .GroupBy(q => q.Role)
                .Select(g => new { role = g.Key, count = g.Count() })
                .ToList();

            return Ok(new { quotas, flagged });
        }

        // ══════════════════════════════════════════════════════════════
        // POST /api/qr/quota/set  [Admin]
        // ══════════════════════════════════════════════════════════════
        [HttpPost("quota/set")]
        [Authorize(Roles = "Admin")]
        public IActionResult SetQuota([FromBody] SetQuotaRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Role))
                return BadRequest("Role مطلوب");
            if (req.Limit < 0 || req.Limit > 99999)
                return BadRequest("Limit يجب أن يكون بين 0 و 99999");

            var periodType = req.PeriodType ?? "Monthly";
            var now        = DateTime.UtcNow;

            DateTime periodStart, periodEnd;
            if (periodType == "Yearly")
            {
                periodStart = new DateTime(now.Year, 1, 1);
                periodEnd   = periodStart.AddYears(1);
            }
            else
            {
                periodStart = new DateTime(now.Year, now.Month, 1);
                periodEnd   = periodStart.AddMonths(1);
            }

            var existing = _context.QrQuotas
                .Where(q => q.Role == req.Role && q.Username == req.Username
                         && q.IsActive && q.PeriodStart == periodStart)
                .ToList();
            foreach (var e in existing) { e.IsActive = false; e.UpdatedAt = now; }

            var quota = new QrQuota
            {
                Role        = req.Role,
                Username    = string.IsNullOrWhiteSpace(req.Username) ? null : req.Username,
                QuotaLimit  = req.Limit,
                IssuedCount = 0,
                PeriodType  = periodType,
                PeriodStart = periodStart,
                PeriodEnd   = periodEnd,
                IsActive    = true,
                CreatedAt   = now,
                UpdatedAt   = now
            };
            _context.QrQuotas.Add(quota);
            _context.SaveChanges();

            return Ok(new
            {
                message     = $"تم تعيين الحصة: {req.Limit} QR/{periodType} لـ {req.Role}" +
                              (string.IsNullOrWhiteSpace(req.Username) ? " (role-wide)" : $" / {req.Username}"),
                quotaId     = quota.Id,
                limit       = quota.QuotaLimit,
                periodStart = quota.PeriodStart.ToString("yyyy-MM-dd"),
                periodEnd   = quota.PeriodEnd.ToString("yyyy-MM-dd")
            });
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/issuances  [Admin]
        // ══════════════════════════════════════════════════════════════
        [HttpGet("issuances")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetIssuances(
            [FromQuery] string? status = null,
            [FromQuery] string? role   = null,
            [FromQuery] int     limit  = 200)
        {
            var query = _context.QrIssuances.AsQueryable();
            if (!string.IsNullOrEmpty(status) && status != "ALL")
                query = query.Where(q => q.Status == status);
            if (!string.IsNullOrEmpty(role) && role != "ALL")
                query = query.Where(q => q.Role == role);

            var issuances = query
                .OrderByDescending(q => q.IssuedAt)
                .Take(limit)
                .Select(q => new
                {
                    q.Id, q.DrugId, q.DrugName, q.Username, q.Role,
                    q.QuotaLimit, q.SequenceNumber, q.Status, q.SuspicionReason,
                    q.IpAddress,
                    issuedAt = q.IssuedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList();

            var stats = new
            {
                total      = _context.QrIssuances.Count(),
                valid      = _context.QrIssuances.Count(q => q.Status == "Valid"),
                suspicious = _context.QrIssuances.Count(q => q.Status == "Suspicious"),
                blocked    = _context.QrIssuances.Count(q => q.Status == "Blocked"),
            };

            return Ok(new { stats, issuances });
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/qr/scan-logs  [Admin]
        // ══════════════════════════════════════════════════════════════
        [HttpGet("scan-logs")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetScanLogs(
            [FromQuery] string? attackType = null,
            [FromQuery] int     limit      = 100)
        {
            var query = _context.QrScanLogs.AsQueryable();
            if (!string.IsNullOrEmpty(attackType) && attackType != "ALL")
                query = query.Where(l => l.AttackType == attackType);

            var logs = query
                .OrderByDescending(l => l.ScannedAt)
                .Take(limit)
                .Select(l => new
                {
                    l.Id, l.DrugId, l.IsValid, l.AttackType, l.Message, l.IpAddress,
                    scannedAt = l.ScannedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList();

            var stats = new
            {
                total             = _context.QrScanLogs.Count(),
                valid             = _context.QrScanLogs.Count(l => l.IsValid),
                signatureMismatch = _context.QrScanLogs.Count(l => l.AttackType == "SIGNATURE_MISMATCH"),
                dateMismatch      = _context.QrScanLogs.Count(l => l.AttackType == "DATE_MISMATCH"),
                drugNotFound      = _context.QrScanLogs.Count(l => l.AttackType == "DRUG_NOT_FOUND"),
                qrExpired         = _context.QrScanLogs.Count(l => l.AttackType == "QR_EXPIRED"),
                quotaExceeded     = _context.QrScanLogs.Count(l => l.AttackType == "QUOTA_EXCEEDED"),
                duplicateQr       = _context.QrScanLogs.Count(l => l.AttackType == "DUPLICATE_QR"),
            };

            return Ok(new { stats, logs });
        }

        // ══════════════════════════════════════════════════════════════
        // Private helpers
        // ══════════════════════════════════════════════════════════════

        private QrQuota GetOrCreateQuota(string role, string username)
        {
            var now = DateTime.UtcNow;
            var quota = _context.QrQuotas
                .Where(q => q.IsActive && q.PeriodStart <= now && q.PeriodEnd > now
                         && q.Role == role
                         && (q.Username == username || q.Username == null))
                .OrderByDescending(q => q.Username != null)
                .FirstOrDefault();

            if (quota != null) return quota;

            var periodStart = new DateTime(now.Year, now.Month, 1);
            var periodEnd   = periodStart.AddMonths(1);
            var limit       = DefaultQuotas.TryGetValue(role, out var d) ? d : 100;

            quota = new QrQuota
            {
                Role        = role,
                Username    = username,
                QuotaLimit  = limit,
                IssuedCount = 0,
                PeriodType  = "Monthly",
                PeriodStart = periodStart,
                PeriodEnd   = periodEnd,
                IsActive    = true,
                CreatedAt   = now,
                UpdatedAt   = now
            };
            _context.QrQuotas.Add(quota);
            _context.SaveChanges();
            return quota;
        }

        /// <summary>Returns the newly created QrIssuance (Id populated after SaveChanges).</summary>
        private QrIssuance RecordIssuance(
            int drugId, string drugName,
            int userId, string username, string role,
            QrQuota quota,
            string status, string? reason,
            string sigPrefix, string ip)
        {
            var issuance = new QrIssuance
            {
                DrugId          = drugId,
                DrugName        = drugName,
                UserId          = userId,
                Username        = username,
                Role            = role,
                QuotaId         = quota.Id,
                QuotaLimit      = quota.QuotaLimit,
                SequenceNumber  = quota.IssuedCount + 1,
                Status          = status,
                SuspicionReason = reason,
                Signature       = sigPrefix,
                IpAddress       = ip,
                IssuedAt        = DateTime.UtcNow
            };
            _context.QrIssuances.Add(issuance);
            return issuance;
        }

        private void SaveLog(int drugId, string prod, string ts,
                             bool isValid, string attackType, string message, string ip)
        {
            _context.QrScanLogs.Add(new QrScanLog
            {
                DrugId         = drugId,
                ProductionDate = prod,
                Timestamp      = ts,
                IsValid        = isValid,
                AttackType     = attackType,
                Message        = message,
                IpAddress      = ip,
                ScannedAt      = DateTime.UtcNow
            });
            _context.SaveChanges();
        }

        // ── New format: binds drugId | mfgDate | expDate | timestamp | aiToken ──
        private string ComputeHmac(int drugId, string mfgDate, string expDate,
                                   string timestamp, string aiToken = "")
        {
            var secret  = _config["Jwt:Key"] ?? "PharmaChainSecretKey";
            var payload = $"{drugId}|{mfgDate}|{expDate}|{timestamp}";
            if (!string.IsNullOrEmpty(aiToken)) payload += $"|{aiToken}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return Convert.ToHexString(hash)[..32];
        }

        // ── Legacy format (v1 QR codes: drugId | prod | timestamp | aiToken) ──
        private string ComputeHmacLegacy(int drugId, string productionDate,
                                         string timestamp, string aiToken = "")
        {
            var secret  = _config["Jwt:Key"] ?? "PharmaChainSecretKey";
            var payload = string.IsNullOrEmpty(aiToken)
                ? $"{drugId}|{productionDate}|{timestamp}"
                : $"{drugId}|{productionDate}|{timestamp}|{aiToken}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            return Convert.ToHexString(hash)[..32];
        }

        private static bool CryptographicEquals(string a, string b)
        {
            if (a.Length != b.Length) return false;
            var result = 0;
            for (int i = 0; i < a.Length; i++)
                result |= a[i] ^ b[i];
            return result == 0;
        }
    }

    // ── Request DTOs ──
    public class SetQuotaRequest
    {
        public string  Role       { get; set; } = string.Empty;
        public string? Username   { get; set; }
        public int     Limit      { get; set; } = 100;
        public string? PeriodType { get; set; } = "Monthly";
    }
}
