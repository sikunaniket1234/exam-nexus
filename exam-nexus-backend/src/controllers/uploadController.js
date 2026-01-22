exports.uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  // In a real app, upload to S3/Cloudinary here.
  // For local dev, we return the local path.
  // Note: You must serve the 'uploads' folder as static in server.js
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.json({ url: fileUrl });
};