using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace PharmaChain.Services
{
    /// <summary>
    /// يستخدم Claude AI لتوليد token فريد وغير قابل للتكرار لكل دواء يُضاف للنظام.
    /// الـ token يدخل في HMAC-SHA256 للـ QR Code — مما يجعل تزوير أي QR مستحيلاً.
    /// </summary>
    public class AiTokenService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<AiTokenService> _logger;

        public AiTokenService(IHttpClientFactory httpClientFactory,
                              IConfiguration config,
                              ILogger<AiTokenService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        /// <summary>
        /// يولّد token فريد 32-char hex لدواء معين.
        /// يستخدم Claude AI إذا كان المفتاح متاحاً — وإلا يرجع لـ crypto fallback آمن.
        /// </summary>
        public async Task<string> GenerateUniqueTokenAsync(
            string drugName,
            string manufacturer,
            string batchHash,
            DateTime expiryDate,
            int quantity)
        {
            var apiKey = _config["Anthropic:ApiKey"] ?? "";

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("YOUR_"))
            {
                _logger.LogInformation("Anthropic API key not configured — using crypto fallback token");
                return GenerateCryptoToken(drugName, manufacturer, batchHash, expiryDate, quantity);
            }

            try
            {
                return await CallClaudeForTokenAsync(apiKey, drugName, manufacturer, batchHash, expiryDate, quantity);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Claude API call failed — falling back to crypto token");
                return GenerateCryptoToken(drugName, manufacturer, batchHash, expiryDate, quantity);
            }
        }

        private async Task<string> CallClaudeForTokenAsync(
            string apiKey,
            string drugName, string manufacturer, string batchHash,
            DateTime expiryDate, int quantity)
        {
            // nanosecond-precision timestamp — impossible to reproduce exactly
            var ticks    = DateTime.UtcNow.Ticks;
            var entropy  = Guid.NewGuid().ToString("N")[..8].ToUpper();

            var prompt =
                $"You are a pharmaceutical blockchain security system. " +
                $"Generate a unique 32-character uppercase hexadecimal authentication token for drug tracking. " +
                $"Drug fingerprint: {drugName}|{manufacturer}|{batchHash}|{expiryDate:yyyy-MM-dd}|{quantity}|{ticks}|{entropy}. " +
                $"Rules: output ONLY the 32 hex characters (0-9 and A-F), no spaces, no explanation, no prefix.";

            var requestBody = new
            {
                model    = "claude-haiku-4-5-20251001",
                max_tokens = 64,
                messages = new[] { new { role = "user", content = prompt } }
            };

            var client = _httpClientFactory.CreateClient("Anthropic");
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var json     = JsonSerializer.Serialize(requestBody);
            var content  = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://api.anthropic.com/v1/messages", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Claude API returned {Status}", response.StatusCode);
                return GenerateCryptoToken(drugName, manufacturer, batchHash, expiryDate, quantity);
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc  = JsonDocument.Parse(body);
            var text = doc.RootElement
                         .GetProperty("content")[0]
                         .GetProperty("text")
                         .GetString() ?? "";

            // Keep only valid hex chars
            var token = new string(
                text.ToUpper()
                    .Where(c => (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F'))
                    .ToArray());

            if (token.Length >= 32)
                return token[..32];

            // Pad with crypto if Claude output was too short
            var pad = GenerateCryptoToken(drugName, manufacturer, batchHash, expiryDate, quantity);
            return (token + pad)[..32];
        }

        /// <summary>
        /// Fallback آمن: SHA-256 of drug properties + nanosecond timestamp + GUID.
        /// يضمن التفرد حتى بدون اتصال بـ AI.
        /// </summary>
        private static string GenerateCryptoToken(
            string drugName, string manufacturer, string batchHash,
            DateTime expiryDate, int quantity)
        {
            var ticks   = DateTime.UtcNow.Ticks;
            var guid    = Guid.NewGuid().ToString("N");
            var input   = $"PHARMACHAIN|{drugName}|{manufacturer}|{batchHash}|{expiryDate:O}|{quantity}|{ticks}|{guid}";

            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(hash)[..32];
        }
    }
}
