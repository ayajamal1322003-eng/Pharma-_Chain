namespace PharmaChain.Models
{
    public class Drug
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        // تاريخ إنتاج الدواء الفعلي — يُدخله المصنع، يُربط رياضياً في HMAC
        public DateTime ManufactureDate { get; set; } = DateTime.UtcNow;
        // تاريخ انتهاء صلاحية الدواء — يُربط رياضياً في HMAC ويُحدّد انتهاء QR أيضاً
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
