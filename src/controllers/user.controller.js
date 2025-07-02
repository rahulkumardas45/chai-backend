
import { asyncHandler } from "../utils/asyncHandler.js";

import {ApiError} from '../utils/ApiError.js';
import { User } from "../models/user.model.js";

import {upoloadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
   //get uers details from frontend
   //validation - not empty
   //check if user already exists
   //check for image, check for avatar .
   // upload image to cloudinary,avatar
   //create user object -create entry in db
   //remove password and refresh token from response
   // check for user creation
   //return res
  const {fullName, email, username, password}=req.body
  // console.log("email: ", email);

//   if(fullName === "" ){
//     throw new ApiError(400, "Full name is required");
//   }

if(
    [fullName,email,username,password].some((field)=>
      field?.trim() === "")
    )
{
    throw new ApiError(400, "All fields are required");
}

const existedUser =  await User.findOne({
  $or: [{ username },{email}]

})


if(existedUser){
    throw new ApiError(409, "User already exists");
}

console.log(req.files);

const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalpath=req.files?.coverImage[0]?.path;

let coverImageLocalpath;
if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
  coverImageLocalpath=req.files?.coverImage[0].path;
}










if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
}

  const avatar= await upoloadOnCloudinary(avatarLocalPath)
  const coverImage= await upoloadOnCloudinary(coverImageLocalpath)

  if(!avatar){
    throw new ApiError(400, "Avatar is required");
  }

  User.create(
    {
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    }
  )

    const createdUser= await User.findById(User._id).select(
        "-password -refreshToken"

    )

    if(!createdUser){
        throw new ApiError(500, "User not found");
    }

 return res.status(201).json(
    new ApiResponse(200, createdUser,"user registered successfully")
 )

})


export {
     registerUser 
    };