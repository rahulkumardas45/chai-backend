import mongoose ,{Schema} from "mongoose";

//use of the aggregate paginate is all video are not possible to show in one page so we load in nother page or scroll
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new Schema({
    content: {
        type: String,
        required: true

    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Video"

    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"

    }

},
{
    timestamps: true
}
)

commentSchema.plugin(mongooseAggregatePaginate)


export const Comment = mongoose.model("Comment", commentSchema)