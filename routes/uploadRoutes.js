const express = require('express');
const path = require('path');
const fs = require('fs');
const { upload, handleUploadError } = require('../middlewares/upload');
const auth = require('../middlewares/auth');

const router = express.Router();

// Upload multiple files
router.post('/files', auth, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/api/upload/file/${file.filename}`,
      category: getFileCategory(file.mimetype),
      uploadedAt: new Date()
    }));

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files'
    });
  }
});

// Serve uploaded files
router.get('/file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Search in all subdirectories
    const subdirs = ['images', 'videos', 'audio', 'documents', 'others'];
    let filePath = null;
    
    for (const subdir of subdirs) {
      const testPath = path.join(__dirname, '../uploads', subdir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    // For images, set cache headers
    if (mimeType.startsWith('image/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve file'
    });
  }
});

// Delete uploaded file
router.delete('/file/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Search in all subdirectories
    const subdirs = ['images', 'videos', 'audio', 'documents', 'others'];
    let filePath = null;
    
    for (const subdir of subdirs) {
      const testPath = path.join(__dirname, '../uploads', subdir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Get file info
router.get('/info/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Search in all subdirectories
    const subdirs = ['images', 'videos', 'audio', 'documents', 'others'];
    let filePath = null;
    let category = 'other';
    
    for (const subdir of subdirs) {
      const testPath = path.join(__dirname, '../uploads', subdir, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        category = subdir.slice(0, -1); // Remove 's' from plural
        break;
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename);
    
    res.json({
      success: true,
      file: {
        filename,
        size: stats.size,
        category,
        extension: ext,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `/api/upload/file/${filename}`
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file info'
    });
  }
});

// Helper function
function getFileCategory(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf' || mimetype.includes('document') || mimetype === 'text/plain') return 'document';
  return 'other';
}

// Apply error handling middleware
router.use(handleUploadError);

module.exports = router;
