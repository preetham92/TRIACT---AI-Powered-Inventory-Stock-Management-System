export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  res.status(200).json({ message: "Logged out successfully" });
}
