namespace PharmaChain.Models
{
    /// <summary>
    /// Tracks the QR code generation quota assigned to a role or specific user
    /// for a given time period (Monthly / Yearly).
    /// </summary>
    public class QrQuota
    {
        public int Id { get; set; }

        /// <summary>Role this quota applies to (Factory, Distributor, Pharmacy, Admin…).</summary>
        public string Role { get; set; } = string.Empty;

        /// <summary>
        /// Optional: username this quota is pinned to.
        /// NULL means it is a role-wide default quota.
        /// A user-specific quota always takes priority over the role default.
        /// </summary>
        public string? Username { get; set; }

        /// <summary>Maximum number of QR codes that may be issued in the period.</summary>
        public int QuotaLimit { get; set; } = 100;

        /// <summary>How many QR codes have been issued so far in the current period.</summary>
        public int IssuedCount { get; set; } = 0;

        /// <summary>Monthly | Yearly</summary>
        public string PeriodType { get; set; } = "Monthly";

        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd   { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
