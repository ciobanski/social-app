// utils/privacy.js

const User = require('../models/User');

/**
 * Can viewerId see a “post”? (we already added this earlier)
 */
async function canViewPost(viewerId, post) {
  if (post.visibility === 'public') return true;
  if (!viewerId) return false;
  if (post.visibility === 'private') {
    return post.author.equals(viewerId);
  }
  // friends-only
  if (post.visibility === 'friends') {
    if (post.author.equals(viewerId)) return true;
    const viewer = await User.findById(viewerId, 'friends');
    return viewer.friends.some(f => f.equals(post.author));
  }
  return false;
}

/**
 * Can viewerId see a profile field on “ownerUser” given its visibility?
 */
async function canViewField(viewerId, ownerUser, visibility) {
  if (visibility === 'public') return true;
  if (!viewerId) return false;
  // private → only owner
  if (visibility === 'private') {
    return ownerUser._id.equals(viewerId);
  }
  // friends-only
  if (visibility === 'friends') {
    if (ownerUser._id.equals(viewerId)) return true;
    // ownerUser.friends is an array of ObjectId
    return ownerUser.friends.some(fId => fId.equals(viewerId));
  }
  return false;
}

module.exports = { canViewPost, canViewField };
