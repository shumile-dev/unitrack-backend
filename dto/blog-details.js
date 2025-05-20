class BlogDetailsDTO{
    constructor(blog){
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
        this.isResolved = blog.isResolved;
        this.createdAt = blog.createdAt;
        
        // Handle author properties safely
        if (blog.author && typeof blog.author === 'object') {
            this.author = {
                _id: blog.author._id,
                username: blog.author.username,
                email: blog.author.email,
                profileImage: blog.author.profileImage
            };
        } else {
            this.author = blog.author; // Keep the author ID if it's a string
        }
    }
}

module.exports = BlogDetailsDTO;