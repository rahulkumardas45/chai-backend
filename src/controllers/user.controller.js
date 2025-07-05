
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import { User } from "../models/user.model.js";
import {upoloadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user = await User.findById(userId)
    const refreshToken = user.generateRefreshToken()
    const accessToken = user.generateAccessToken()

     user.refreshToken = refreshToken
     await user.save({ validateBeforeSave: false})
     return {accessToken, refreshToken}
    
  } catch (error) {
     throw new ApiError(400, "something went wrong while generating refresh and accsess token");
  }
}

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

// console.log(req.files);

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

const loginUser = asyncHandler(async (req, res)=>{

  //req-body= data
  //username or email
  //find the user in database
  //password check
  //send access and refresh token
  //in form of cookie

  const {email, username, password} = req.body
   console.log(email);

  if(!username && !email){
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{username}, {email}],
  })

  if(!user){
    throw new ApiError(404, "user does not exist")
  }

const isPasswordValid = await user.isPasswordCorrect(password)
 console.log(isPasswordValid);
 
if(!isPasswordValid){
  throw new ApiError(401, "invalid user credentials");
}

const {accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   console.log(loggedInUser);
//it is use to cookie does not edit ib frontend
     const options = {
      httpOnly: true,
      secure: true
     }
//next send cookie
     return res
     .status(200)
     .cookie("refreshToken", refreshToken, options)
     .cookie("accessToken",accessToken, options)
     .json(
      new ApiResponse(200,
         {
          user: loggedInUser, accessToken, refreshToken
         },

         "user logged in successfully")
     )

})

const logoutUser = asyncHandler( async(req ,res)=>{
  User.findByIdAndUpdate(
       req.user._id,
       {
        $set: {
          refreshToken: undefined
        }
       },
       {
        new: true
       }

  )
  const options ={
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("refreshToken", options)
  .clearCookie("accessToken", options)
  .json(new ApiResponse(200, {}, "user logged out successfully"))

     
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
 const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken

 if(!incomingRefreshToken){
  throw new ApiError(401, "unauthorized request")
 }
  try {
    const decodedToken = jwt.verify( 
    incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
       throw new ApiError(401, "Invalid refreh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "refreh token expired or used")
  
    }
  
  const options ={
    httpOnly: true,
    secure: true
  }
  
  const {accessToken, newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
  
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken", newrefreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        accessToken, refreshToken:newrefreshToken,
      },
      "Access token refreshed "
    )
  )
  
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    
  const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
   
   if(!isPasswordCorrect){
    throw new ApiError(401, "Old password is incorrect")
   }
  
   user.password = newPassword

  //  if(newPassword !== conformPassword){
  //   throw new ApiError(401, "New password and conform password are not same")
  //  }

   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(
     new ApiResponse(200, {}, "password has been change successfully")
   )

})

const getCurrentUser = asyncHandler(async(req, res)=>{
  return res
  .status(200)
  .json(200, req.user, "current user fetch successfully")

})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    
  const {fullName, email}= req.body

    if(!fullName || !email){
      throw new ApiError(400, "All the fields are required")
    }

   const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    {new: true}
  
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse( 200, {}, "account details updated successfully"))


    

})

const updateUserAvatar = asyncHandler (async(req, res)=>
  {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing")
  }
   
  // //TODO DELETE OLD IMAGE --ASSINGMENT
  // const avatartoDelete = await User.findByIdAndUpdate(
  //   req.user?._id,
  //   {
  //     avatartoDelete:user.avatar
  //   }
  //   ).select("-password")




 const avatar = await upoloadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
     throw new ApiError(400, "Error while uploading on avatar")
  }

 const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
       $set:{
        avatar: avatar.url
       }
    },
    {
 new: true
    }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "avatar updated successfully")
    )

})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalpath= req.file?.path
    
    if(!coverImageLocalpath){
      throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await upoloadOnCloudinary(coverImageLocalpath)

    if(!coverImage.url){
      throw new ApiError(400, "Error while uploading on cover image")
    }

     const user = User.findByIdAndUpdate(
      req.user?._id,
      { 
        $set:{
          coverImage: coverImage.url
        }
      },
      {
        new: true
      }
    ).select("-password")

    return res
    .status(200)
    .json(
      new ApiResponse(200, user, "coverImage updated successfully")
    )


})

const getUserChannelProfile =asyncHandler(async(req, res)=>{
  // get username of the profile from url using params

  const {username}= req.params

  if(!username){
    throw new ApiError(400, "username is missing")
  }
// aggerrette the function
   const channel = await User.aggregate([
      //in first pipeline match the username in db
    {
      $match:{
        username: username?.toLowerCase()
      }
    },

    //count the subscribers from document 
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "Subscribers"
 
      }

    },
    //count the number of channel to be subscribed from document

    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "SubscribedTo"
 
      }
    },
// add the extra fields in User database schema
    {
    $addFields:{
       subscribersCount: {
          $size: "$Subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$SubscribedTo"

        },
       isSubscribed: {
        $cond: {
          if: {
            $in: [req.user?._id, "$subscribers.subscriber"]
          },
          then: true,
          else: false
        }

        }
      },


    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar:1,
        coverImage: 1,
        email: 1



      }
    }
   ])

   if(!channel?.length){
    throw new ApiError( 404, "Channel does not exist ")

   }

   return res
   .status(200)
   .json(
      new ApiResponse( 200, "Channel fetch successfully ", channel[0])
   )

})


const getWatchHistory = asyncHandler(async(req, res)=>{
  // const history = req.params

const user = await User.aggregate([

  {
    //req.user._id return  string but
    //  it convert into mongooes db id
    $match: { 
      _id: new mongoose.Types.ObjectId('req.user._id')
    }
  },

  //nested pipeline
  {
    $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {

            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1
                      
                  }
                }
              ]
            }
          },
          
          {
             $addFields: {
                owner: {
                  $first: "$owner"
                }
             }
          }

        ]
    }
  }

])


return res
.status(200)
.json(
  new ApiResponse(200, 

    user[0].watchHistory,
    
    "watchhistory fetched successfully")
)

})







export {
     registerUser,
     loginUser ,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetails,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory

    };