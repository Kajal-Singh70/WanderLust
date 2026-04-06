const Listing = require("../models/listing");

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports.index = async (req,res)=>{
   const searchQuery = (req.query.search || "").trim();
   const selectedCountry = (req.query.country || "").trim();

   const availableCountries = (await Listing.distinct("country"))
   .filter(Boolean)
   .sort();

   const filters = [];

   if(searchQuery){
    const safeSearchQuery = escapeRegex(searchQuery);
    filters.push({
        $or: [
            {title: {$regex: safeSearchQuery, $options: "i"}},
            {location: {$regex: safeSearchQuery, $options: "i"}},
            {description: {$regex: safeSearchQuery, $options: "i"}},
        ],
    });
   }

   const isValidCountry = availableCountries.includes(selectedCountry);

   if(selectedCountry && isValidCountry){
    filters.push({country: selectedCountry});
   }

   const query = filters.length ? {$and: filters} : {};
   const allListings = await Listing.find(query);

   res.render("listings/index", {
    allListings,
    searchQuery,
    selectedCountry: isValidCountry ? selectedCountry : "",
    availableCountries,
   }); 
};
module.exports.renderNewForms =  (req,res) =>{
    res.render("listings/new.ejs")
};

module.exports.showListing =async(req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id)
    .populate({
        path:"reviews",
         populate:{
            path:"author"
        },
        })
        .populate("owner");
    if(!listing){
        req.flash("error","Listing you requested for does not exit!");
       return res.redirect("/listings");
    }
   // console.log(listing);
    res.render("listings/show", {listing});
};

 module.exports.createListing = async(req,res,next)=>{
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url,filename}; 
     await newListing.save();
      req.flash("success","New Listing Created!");
     res.redirect("/listings");
     };

     module.exports.renderEditForm = async(req,res)=>{
     let {id} = req.params;
    const listing = await Listing.findById(id);
     if(!listing){
        req.flash("error","Listing you requested for does not exit!");
         return res.redirect("/listings"); 
    }
    let originalImageUrl = listing.image.url;
   originalImageUrl = originalImageUrl.replace(
  "/upload",
  "/upload/h_300,w_250,c_fit");
    res.render("listings/edit", {listing, originalImageUrl});
};

module.exports.updateListing = async(req,res) => {
   let {id} = req.params;
    let listing=   await Listing.findByIdAndUpdate(id,{...req.body.listing}); 

    if(typeof req.file!=="undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url,filename}; 
      await listing.save();
    }
   req.flash("success","Listing Updated!");
   res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async(req,res)=>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
     req.flash("success","Listing Deleted!");
    res.redirect("/listings");
};