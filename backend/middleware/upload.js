import multer from "multer";

// Storage setup (store in uploads/)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// File filter: only csv/xlsx/xls
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .csv, .xls, .xlsx allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });
export default upload;
