namespace PharmaChain.Services
{
    public class NodeSyncService
    {
        private readonly HttpClient _http;
        private readonly List<string> _peerNodes;

        public NodeSyncService()
        {
            _http = new HttpClient();
            // ── عناوين الـ Nodes الثانية
            _peerNodes = new List<string>
            {
                "http://localhost:7037"
            };
        }

        // ── يرسل الـ Block الجديد لكل الـ Nodes
        public async Task BroadcastBlock(object blockData)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(blockData);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            foreach (var node in _peerNodes)
            {
                try
                {
                    await _http.PostAsync($"{node}/api/transaction/receive-block", content);
                }
                catch
                {
                    // لو الـ Node ثاني مش شغال، ما يوقف الأول
                }
            }
        }

        public List<string> GetPeerNodes() => _peerNodes;
    }
}