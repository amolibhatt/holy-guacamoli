import type { Express, Request, Response, NextFunction } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";

// Check if we're in Replit environment (has object storage sidecar)
const isReplitEnvironment = (): boolean => {
  return !!(process.env.REPL_ID && process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
};

// Check if Cloudinary URL is properly formatted
const isCloudinaryConfigured = (): boolean => {
  const url = process.env.CLOUDINARY_URL;
  return !!(url && url.startsWith('cloudinary://'));
};

// Lazy load cloudinary only when needed
let cloudinaryInstance: any = null;
const getCloudinary = () => {
  if (!cloudinaryInstance) {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({ secure: true });
    cloudinaryInstance = cloudinary;
  }
  return cloudinaryInstance;
};

// Multer for handling file uploads (for Cloudinary flow)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Authentication middleware for uploads (only authenticated users can upload)
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: "Authentication required" });
};

/**
 * Register object storage routes for file uploads.
 * Supports both Replit Object Storage and Cloudinary as fallback.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const useReplit = isReplitEnvironment();
  const useCloudinary = !useReplit && isCloudinaryConfigured();
  
  console.log(`[Upload] Storage backend: ${useReplit ? 'Replit Object Storage' : useCloudinary ? 'Cloudinary' : 'None configured'}`);

  if (useReplit) {
    // Replit Object Storage flow
    const objectStorageService = new ObjectStorageService();

    app.post("/api/uploads/request-url", isAuthenticated, async (req, res) => {
      try {
        const { name, size, contentType } = req.body;

        if (!name) {
          return res.status(400).json({
            error: "Missing required field: name",
          });
        }

        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

        res.json({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        });
      } catch (error) {
        console.error("Error generating upload URL:", error);
        res.status(500).json({ error: "Failed to generate upload URL" });
      }
    });

    app.get("/objects/:objectPath(*)", async (req, res) => {
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(req.path);
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error("Error serving object:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ error: "Object not found" });
        }
        return res.status(500).json({ error: "Failed to serve object" });
      }
    });
  } else if (useCloudinary) {
    // Cloudinary flow - direct upload with file
    app.post("/api/uploads/request-url", isAuthenticated, async (req, res) => {
      // For Cloudinary, we return a flag indicating direct upload is needed
      res.json({
        useDirectUpload: true,
        uploadEndpoint: "/api/uploads/cloudinary",
      });
    });

    app.post("/api/uploads/cloudinary", isAuthenticated, upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file provided" });
        }

        // Upload to Cloudinary
        const cloudinary = getCloudinary();
        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "holyguacamoli",
              resource_type: "auto",
            },
            (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file!.buffer);
        });

        res.json({
          objectPath: result.secure_url,
          url: result.secure_url,
          publicId: result.public_id,
        });
      } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    });

    // For Cloudinary, images are served directly from Cloudinary CDN
    // No need for /objects/* route
  } else {
    // No storage configured - return helpful error
    console.log(`[Upload] CLOUDINARY_URL value: ${process.env.CLOUDINARY_URL ? 'Set but invalid format' : 'Not set'}`);
    
    app.post("/api/uploads/request-url", isAuthenticated, (req, res) => {
      const cloudinaryUrl = process.env.CLOUDINARY_URL;
      let errorMsg = "File storage not configured.";
      
      if (!cloudinaryUrl) {
        errorMsg = "CLOUDINARY_URL environment variable is not set.";
      } else if (!cloudinaryUrl.startsWith('cloudinary://')) {
        errorMsg = "CLOUDINARY_URL must start with 'cloudinary://'. Current value is invalid.";
      }
      
      console.error(`[Upload] ${errorMsg}`);
      res.status(503).json({ error: errorMsg });
    });
  }
}
