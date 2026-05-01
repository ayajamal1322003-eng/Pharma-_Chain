namespace PharmaChain.Models
{
    public class QrScanLog
    {
        public int Id { get; set; }

        // بيانات الـ QR اللي اتمسح
        public int DrugId { get; set; }
        public string ProductionDate { get; set; } = "";
        public string Timestamp { get; set; } = "";

        // نتيجة الفحص
        public bool IsValid { get; set; }
        public string AttackType { get; set; } = "NONE"; // NONE, SIGNATURE_MISMATCH, DATE_MISMATCH, DRUG_NOT_FOUND, QR_EXPIRED
        public string Message { get; set; } = "";

        // معلومات الطلب
        public string IpAddress { get; set; } = "";
        public DateTime ScannedAt { get; set; } = DateTime.UtcNow;
    }
}