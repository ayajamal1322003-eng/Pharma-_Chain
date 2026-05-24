namespace PharmaChain.Models
{
    public class InventoryItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public string Category { get; set; } = "";
        public string BatchNumber { get; set; } = "";
        public DateTime ExpiryDate { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SellingPrice { get; set; }
        public int CurrentStock { get; set; }
        public int LowStockThreshold { get; set; } = 10;
        public string? QrCode { get; set; }
        public int? DrugId { get; set; }
        public string AddedByUsername { get; set; } = "";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
