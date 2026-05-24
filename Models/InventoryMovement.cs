namespace PharmaChain.Models
{
    public class InventoryMovement
    {
        public int Id { get; set; }
        public int InventoryItemId { get; set; }
        // INITIAL | RESTOCK | SALE | CORRECTION
        public string ActionType { get; set; } = "";
        public int QuantityChanged { get; set; }
        public int StockBefore { get; set; }
        public int StockAfter { get; set; }
        public string PerformedByUsername { get; set; } = "";
        public string Notes { get; set; } = "";
        public int? SaleTransactionId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
