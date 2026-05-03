namespace PharmaChain.Models
{
    public class Drug
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public DateTime ExpiryDate { get; set; }
        public string Manufacturer { get; set; } = string.Empty;
        public string AddedByRole { get; set; } = string.Empty;
        public int Quantity { get; set; } = 0;
        public string Checksum { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // AI-generated unique token — توليد فريد لكل دواء عبر Claude AI
        public string AiToken { get; set; } = string.Empty;
    }
}