class BlogDTO {
  constructor(blog) {
    this._id = blog._id;
    this.title = blog.title;
    this.description = blog.description;
    this.photoPath = blog.photoPath;
    this.location = blog.location;
    this.latitude = blog.latitude;
    this.longitude = blog.longitude;
    this.date = blog.date;
    this.reporter = blog.reporter;
    this.phone = blog.phone;
    this.type = blog.type;
    this.isBlocked = blog.isBlocked;
    
    // Handle author properties safely
    if (blog.author && typeof blog.author !== 'string') {
      this.author = blog.author._id;
      this.username = blog.author.username;
      this.authorPhotoPath = blog.author.profileImage;
    } else {
      this.author = blog.author;
      this.username = null;
      this.authorPhotoPath = null;
    }
  }
}
module.exports = BlogDTO;
  