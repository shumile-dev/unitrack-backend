const Joi = require("joi");
const fs = require("fs");
const Blog = require("../models/blog");
const {
  BACKEND_SERVER_PATH,
  CLOUD_NAME,
  API_SECRET,
  API_KEY,
} = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require("../dto/blog-details");
const path = require("path");
const { type } = require("os");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configuration
cloudinary.config({
  cloud_name: "dxxvqqcbd",
  api_key: "664511295759937",
  api_secret: "T5rx4GbXAYylXSip623SnXUYUcQ", // Click 'View API Keys' above to copy your API secret
});
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
  async create(req, res, next) {
    console.log(req.body);
    console.log("inside crearteeeeeeeee");
    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern),
      description: Joi.string().required(),
      location: Joi.string().required(),
      latitude: Joi.number(),
      longitude: Joi.number(),
      date: Joi.date().required(),
      reporter: Joi.string().required(),
      type: Joi.string().valid("found", "lost").required(),
      photoPath: Joi.string(),
      isBlocked: Joi.boolean()
    });

    const { error } = createBlogSchema.validate(req.body);
    if (error) return next(error);
    console.log("no error ");
    const { title, author, description, location, latitude, longitude, date, reporter, type, photoPath, isBlocked } = req.body;
    
    let finalPhotoUrl = photoPath;

    // If no direct photoPath is provided, process uploaded file
    if (!photoPath && req.file) {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Photo file is required" });
      }

      try {
        console.log("inside try");
        // Upload buffer using cloudinary upload_stream
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "post_photos", // You can change the folder name if needed
              resource_type: "auto", // 👈 this is important for videos
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(file.buffer); // send the buffer here
        });

        finalPhotoUrl = result.secure_url;
        console.log("photoUrl:", finalPhotoUrl);
      } catch (cloudinaryError) {
        console.error("Cloudinary Upload Error:", cloudinaryError);
        return res
          .status(500)
          .json({ error: "Failed to upload photo to Cloudinary" });
      }
    } else if (!photoPath && !req.file) {
      return res.status(400).json({ error: "Either photoPath or file upload is required" });
    }

    try {
      console.log("inside try 2");
      const newBlog = new Blog({
        title,
        description,
        photoPath: finalPhotoUrl,
        location,
        latitude,
        longitude,
        date,
        reporter,
        type,
        author: author || null,
        isBlocked: isBlocked || false
      });

      await newBlog.save();
      if (author) {
        await newBlog.populate("author", "username");
      }

      const blogDto = new BlogDTO(newBlog);
      return res.status(201).json({ blog: blogDto });
    } catch (dbError) {
      console.error("Database Error:", dbError);
      return res.status(500).json({ error: "Failed to save blog to database" });
    }
  },
  async getByAuthor(req, res, next) {
    console.log("getByAuthor called");

    const getByAuthorSchema = Joi.object({
      authorId: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByAuthorSchema.validate(req.params);

    if (error) {
      return next(error);
    }

    const { authorId } = req.params;

    let blogs;

    try {
      blogs = await Blog.find({ author: authorId }).populate(
        "author",
        "name profileImage"
      );
    } catch (err) {
      return next(err);
    }

    const blogDtos = blogs.map((blog) => new BlogDTO(blog)); // Match structure with getAll

    return res.status(200).json({ blogs: blogDtos });
  },
  async searchByName(req, res, next) {
    const title = req.query.title;
    try {
      const blogs = await Blog.find({
        title: { $regex: new RegExp(title, "i") }, // case-insensitive
      });
      res.json(blogs);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({}).populate("author", "name profileImage");
      const blogsDto = blogs.map((blog) => new BlogDTO(blog));

      return res.status(200).json({ blogs: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    // validate id
    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByIdSchema.validate(req.params);

    if (error) {
      return next(error);
    }

    let blog;
    const { id } = req.params;

    try {
      blog = await Blog.findOne({ _id: id }).populate('author', 'username email _id profileImage');
      
      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }

      const blogDto = new BlogDetailsDTO(blog);
      return res.status(200).json({ blog: blogDto });
    } catch (error) {
      return next(error);
    }
  },
  async update(req, res, next) {
    try {
      console.log("Update request body:", req.body);
      
      // Validate the request
      const updateBlogSchema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        latitude: Joi.number(),
        longitude: Joi.number(),
        date: Joi.date().required(),
        reporter: Joi.string().required(),
        type: Joi.string().valid("found", "lost").required(),
        author: Joi.string().regex(mongodbIdPattern),
        blogId: Joi.string().regex(mongodbIdPattern).required(),
        photoPath: Joi.string(),
      });

      const { error } = updateBlogSchema.validate(req.body);
      if (error) {
        console.log("Validation error:", error);
        return next(error);
      }

      const { 
        title, 
        description, 
        location, 
        latitude, 
        longitude, 
        date, 
        reporter, 
        type, 
        author, 
        blogId, 
        photoPath 
      } = req.body;

      // Find the existing blog
      let blog;
      try {
        blog = await Blog.findOne({ _id: blogId });
        if (!blog) {
          return res.status(404).json({ error: "Blog not found" });
        }
      } catch (error) {
        console.log("Error finding blog:", error);
        return next(error);
      }

      // Handle photo upload
      let finalPhotoUrl = blog.photoPath; // Default to existing photo
      
      // Process uploaded file if present
      if (req.file) {
        try {
          // Upload to cloudinary
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: "post_photos",
                resource_type: "auto",
              },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            stream.end(req.file.buffer);
          });

          finalPhotoUrl = result.secure_url;
        } catch (cloudinaryError) {
          console.error("Cloudinary Upload Error:", cloudinaryError);
          return res
            .status(500)
            .json({ error: "Failed to upload photo to Cloudinary" });
        }
      } else if (photoPath) {
        // If a photoPath string is provided directly, use it
        finalPhotoUrl = photoPath;
      }

      // Update the blog post
      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          description,
          photoPath: finalPhotoUrl,
          location,
          latitude,
          longitude,
          date,
          reporter,
          type
        }
      );

      return res.status(200).json({ message: "Blog updated successfully" });
    } catch (error) {
      console.error("Update error:", error);
      return next(error);
    }
  },
  async delete(req, res, next) {
    // validate id
    // delete blog

    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = deleteBlogSchema.validate(req.params);

    const { id } = req.params;

    // delete blog
    try {
      await Blog.deleteOne({ _id: id });
      
      // Comment deletion removed to fix "Comment is not defined" error
    } catch (error) {
      return next(error);
    }

    return res.status(200).json({ message: "blog deleted" });
  },
};

module.exports = blogController;
