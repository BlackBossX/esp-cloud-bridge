export default async function handler(req, res) {
  const BACKEND_URL = process.env.BACKEND_URL || "http://YOUR_SERVER_IP:8080";
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; 
    const response = await fetch(`${BACKEND_URL}/api/gpio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to connect to EC2 server: " + error.message });
  }
}
