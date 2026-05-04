namespace PharmaChain.Models
{
    /// <summary>
    /// Records every QR code that was issued, including its sequential number
    /// within the active quota period.  Used for range-based tampering detection.
    /// </summary>
    public class QrIssuance
    {
        public int Id { get; set; }

        public int    DrugId   { get; set; }
        public string DrugName { get; set; } = string.Empty;

        public int    UserId   { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role     { get; set; } = string.Empty;

        /// <summary>FK to the QrQuota row that was consumed.</summary>
        public int QuotaId    { get; set; }

        /// <summary>Snapshot of the limit at the moment of issuance.</summary>
        public int QuotaLimit { get; set; }

        /// <summary>
        /// Sequential position within the quota period (1-based).
        /// Equals IssuedCount at the time this QR was generated.
        /// </summary>
        public int SequenceNumber { get; set; }

        /// <summary>Valid | Suspicious | Blocked</summary>
        public string  Status           { get; set; } = "Valid";
        public string? SuspicionReason  { get; set; }

        /// <summary>First 16 chars of the HMAC signature embedded in the QR URL.</summary>
        public string Signature  { get; set; } = string.Empty;
        public string IpAddress  { get; set; } = string.Empty;

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    }
}
