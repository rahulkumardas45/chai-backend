import { v2 as cloudinary } from 'cloudinary';
import  fs from 'fs';

// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET

    });

 // file upload 
 const upoloadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        //upload the file on cloudinary
        const response= await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // Automatically detect the resource type
        });
        console.log('File uploaded successfully:', response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // Delete the local file if upload fails
        return null;
    }

 }

 export {upoloadOnCloudinary}




    