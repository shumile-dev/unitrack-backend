class UserDTO {
    constructor(user) {
        this._id = user._id;
        // this.username = user.username;
        this.name = user.name;
        this.phone = user.phone;
        this.email = user.email;
        this.profileImage = user.profileImage;
        this.role = user.role;
        this.location = user.location; // Add location field
        
        // New fields from updated schema
        this.rollNumber = user.rollNumber;
        this.semester = user.semester;
        this.department = user.department;
        this.degree = user.degree;
    }
}

module.exports = UserDTO;
