using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaChain.Data;

namespace PharmaChain.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,LedgerAdmin")]
    public class AuditController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuditController(AppDbContext context)
        {
            _context = context;
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/audit
        //  Classic AuditLog table only (backward-compatible).
        // ════════════════════════════════════════════════════════
        [HttpGet]
        public IActionResult GetLogs()
        {
            var logs = _context.AuditLogs
                .OrderByDescending(l => l.Timestamp)
                .ToList();
            return Ok(logs);
        }

        // ════════════════════════════════════════════════════════
        //  GET /api/audit/full
        //  Unified timeline from ALL four data sources:
        //    SYSTEM    → AuditLogs       (login, add-drug, transfer, tamper…)
        //    QR_SCAN   → QrScanLogs      (customer scan attempts, attacks)
        //    QR_ISSUED → QrIssuances     (every QR code generated)
        //    BLOCKCHAIN→ DrugTransactions(DRUG_REGISTERED, QR_GENERATED, TRANSFER, CUSTOMER_SCAN)
        //
        //  Query params:
        //    source   = ALL | SYSTEM | QR_SCAN | QR_ISSUED | BLOCKCHAIN
        //    search   = free text (actor, drug name, details)
        //    limit    = max rows per source before merge (default 500)
        // ════════════════════════════════════════════════════════
        [HttpGet("full")]
        public IActionResult GetFullLog(
            [FromQuery] string? source = null,
            [FromQuery] string? search = null,
            [FromQuery] int     limit  = 500)
        {
            limit = Math.Min(limit, 2000);
            var events = new List<UnifiedEvent>();

            // ── 1. System audit log ──
            _context.AuditLogs
                .OrderByDescending(l => l.Timestamp)
                .Take(limit)
                .ToList()
                .ForEach(l => events.Add(new UnifiedEvent
                {
                    Id        = "A" + l.Id,
                    Source    = "SYSTEM",
                    EventType = l.Action,
                    Actor     = l.Username,
                    ActorRole = null,
                    Details   = l.Details,
                    Timestamp = l.Timestamp,
                    IpAddress = l.IpAddress
                }));

            // ── 2. QR scan log (every customer/attacker scan) ──
            _context.QrScanLogs
                .OrderByDescending(l => l.ScannedAt)
                .Take(limit)
                .ToList()
                .ForEach(l => events.Add(new UnifiedEvent
                {
                    Id         = "S" + l.Id,
                    Source     = "QR_SCAN",
                    EventType  = l.IsValid ? "SCAN_VALID" : "SCAN_ATTACK",
                    Actor      = l.IpAddress,
                    DrugId     = l.DrugId,
                    Details    = l.Message,
                    AttackType = l.AttackType,
                    Status     = l.IsValid ? "Valid" : "Attack",
                    Timestamp  = l.ScannedAt,
                    IpAddress  = l.IpAddress
                }));

            // ── 3. QR issuance log (every QR code generated) ──
            _context.QrIssuances
                .OrderByDescending(l => l.IssuedAt)
                .Take(limit)
                .ToList()
                .ForEach(l => events.Add(new UnifiedEvent
                {
                    Id        = "I" + l.Id,
                    Source    = "QR_ISSUED",
                    EventType = "QR_ISSUED",
                    Actor     = l.Username,
                    ActorRole = l.Role,
                    DrugId    = l.DrugId,
                    DrugName  = l.DrugName,
                    Details   = $"Sequence #{l.SequenceNumber}/{l.QuotaLimit}"
                              + (string.IsNullOrEmpty(l.SuspicionReason) ? "" : $" — {l.SuspicionReason}"),
                    Status    = l.Status,
                    Timestamp = l.IssuedAt,
                    IpAddress = l.IpAddress
                }));

            // ── 4. Blockchain ledger (all lifecycle events) ──
            _context.DrugTransactions
                .OrderByDescending(l => l.BlockNumber)
                .Take(limit)
                .ToList()
                .ForEach(l => events.Add(new UnifiedEvent
                {
                    Id          = "B" + l.Id,
                    Source      = "BLOCKCHAIN",
                    EventType   = l.ActionType ?? "TRANSFER",
                    Actor       = l.FromUsername,
                    ActorRole   = l.FromRole,
                    DrugId      = l.DrugId,
                    DrugName    = l.DrugName,
                    Details     = $"Block #{l.BlockNumber} | {l.FromRole} → {l.ToRole} | Hash: {l.BlockHash}",
                    Status      = l.Status,
                    BlockHash   = l.BlockHash,
                    BlockNumber = l.BlockNumber,
                    Timestamp   = l.Timestamp
                }));

            // ── Filter by source ──
            if (!string.IsNullOrWhiteSpace(source) && source != "ALL")
                events = events.Where(e => e.Source == source).ToList();

            // ── Free-text search ──
            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.ToLower();
                events = events.Where(e =>
                    (e.Actor     ?? "").ToLower().Contains(q) ||
                    (e.DrugName  ?? "").ToLower().Contains(q) ||
                    (e.EventType ?? "").ToLower().Contains(q) ||
                    (e.Details   ?? "").ToLower().Contains(q) ||
                    (e.IpAddress ?? "").ToLower().Contains(q)
                ).ToList();
            }

            // ── Sort all sources together by timestamp desc ──
            var sorted = events
                .OrderByDescending(e => e.Timestamp)
                .Take(limit)
                .ToList();

            // ── Aggregate stats ──
            var allForStats = string.IsNullOrWhiteSpace(source) || source == "ALL"
                ? events : events; // already filtered

            var stats = new
            {
                total      = sorted.Count,
                system     = sorted.Count(e => e.Source == "BLOCKCHAIN" || e.Source == "SYSTEM"),
                qrScans    = sorted.Count(e => e.Source == "QR_SCAN"),
                qrIssued   = sorted.Count(e => e.Source == "QR_ISSUED"),
                blockchain = sorted.Count(e => e.Source == "BLOCKCHAIN"),
                attacks    = sorted.Count(e => e.Source == "QR_SCAN" && e.EventType == "SCAN_ATTACK"),
                validScans = sorted.Count(e => e.Source == "QR_SCAN" && e.EventType == "SCAN_VALID"),
            };

            return Ok(new { stats, events = sorted });
        }
    }

    // ════════════════════════════════════════════════════════
    //  Unified event DTO — normalised across all four tables
    // ════════════════════════════════════════════════════════
    public class UnifiedEvent
    {
        public string    Id          { get; set; } = "";
        public string    Source      { get; set; } = "";   // SYSTEM | QR_SCAN | QR_ISSUED | BLOCKCHAIN
        public string    EventType   { get; set; } = "";
        public string    Actor       { get; set; } = "";
        public string?   ActorRole   { get; set; }
        public int?      DrugId      { get; set; }
        public string?   DrugName    { get; set; }
        public string    Details     { get; set; } = "";
        public string?   AttackType  { get; set; }
        public string?   Status      { get; set; }
        public string?   BlockHash   { get; set; }
        public int?      BlockNumber { get; set; }
        public DateTime  Timestamp   { get; set; }
        public string?   IpAddress   { get; set; }
    }
}
