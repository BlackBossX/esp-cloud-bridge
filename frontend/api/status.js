export default async function handler(req, res) {
  const BACKEND_URL = process.env.BACKEND_URL || "http://YOUR_SERVER_IP:8080";
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to connect to EC2 server: " + error.message });
  }
}
