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
      author: Joi.string().regex(mongodbIdPattern).required(),
      content: Joi.string().required(),
      type: Joi.string().valid("food", "rental").required(),
      price: Joi.number().required(),
    });

    const { error } = createBlogSchema.validate(req.body);
    if (error) return next(error);
    console.log("no error ");
    const { title, author, content, type, price } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Photo file is required" });
    }

    let photoUrl;

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

      photoUrl = result.secure_url;
      console.log("photoUrl:", photoUrl);
    } catch (cloudinaryError) {
      console.error("Cloudinary Upload Error:", cloudinaryError);
      return res
        .status(500)
        .json({ error: "Failed to upload photo to Cloudinary" });
    }

    try {
      console.log("inside try 2");
      const newBlog = new Blog({
        title,
        author,
        content,
        photoPath: photoUrl,
        type,
        price,
      });

      await newBlog.save();
      await newBlog.populate("author", "username");

      const blogDto = new BlogDTO(newBlog);
      return res.status(201).json({ blog: blogDto });
    } catch (dbError) {
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
    // response

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
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }

    const blogDto = new BlogDetailsDTO(blog);

    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    // validate
    //

    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string(),
      price: Joi.number().required(), // Add price validation
    });

    const { error } = updateBlogSchema.validate(req.body);

    const { title, content, author, blogId, photo, price } = req.body;

    // delete previous photo
    // save new photo

    let blog;

    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }

    if (photo) {
      let previousPhoto = blog.photoPath;

      previousPhoto = previousPhoto.split("/").at(-1);

      // delete photo
      fs.unlinkSync(`storage/${previousPhoto}`);

      // read as buffer
      // const buffer = Buffer.from(
      //   photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      //   "base64"
      // );

      // allot a random name
      // const imagePath = `${Date.now()}-${author}.png`;

      // save locally
      let response;
      try {
        response = await cloudinary.uploader.upload(photo);
        // fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }

      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          content,
          photoPath: response.url,
          price,
        }
      );
    } else {
      await Blog.updateOne({ _id: blogId }, { title, content });
    }

    return res.status(200).json({ message: "blog updated!" });
  },
  async delete(req, res, next) {
    // validate id
    // delete blog
    // delete comments on this blog

    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = deleteBlogSchema.validate(req.params);

    const { id } = req.params;

    // delete blog
    // delete comments
    try {
      await Blog.deleteOne({ _id: id });

      await Comment.deleteMany({ blog: id });
    } catch (error) {
      return next(error);
    }

    return res.status(200).json({ message: "blog deleted" });
  },
};

module.exports = blogController;
