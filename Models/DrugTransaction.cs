namespace PharmaChain.Models
{
    public class DrugTransaction
    {
        public int Id { get; set; }
        public int BlockNumber { get; set; }
        public int DrugId { get; set; }
        public string DrugName { get; set; } = string.Empty;
        public string FromRole { get; set; } = string.Empty;
        public string FromUsername { get; set; } = string.Empty;
        public string ToRole { get; set; } = string.Empty;
        public string ToUsername { get; set; } = string.Empty;
        public string Status { get; set; } = "Transferred";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string BlockHash { get; set; } = string.Empty;
        public string PreviousHash { get; set; } = string.Empty;
        public int Nonce { get; set; }                              // ← جديد
        public string MerkleRoot { get; set; } = string.Empty;     // ← جديد
    }
}