namespace PharmaChain.Models
{
    public class SaleTransaction
    {
        public int Id { get; set; }
        public int InventoryItemId { get; set; }
        public string ProductName { get; set; } = "";
        public string Category { get; set; } = "";
        public int QuantitySold { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public string SoldByUsername { get; set; } = "";
        public string Notes { get; set; } = "";
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    }
}
