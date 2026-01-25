import multer, { diskStorage } from "multer";
import path from "path";
import { genAlphaNum } from ".";

const storage = diskStorage({
	filename: (req, file, callback) => {
		const match = [
			"image/jpg", // .jpg, .jpeg
			"image/jpeg", // .jpg, .jpeg
			"image/png", // .png
			"video/mp4", // .mp4
			"application/pdf", // .pdf
			"application/msword", // .doc
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
			"application/zip", // .zip
			"application/x-zip-compressed", // sometimes used for .zip on Windows
		];

		if (match.indexOf(file.mimetype) === -1) {
			const message: any = "File type is invalid. Only image file type is allowed";
			return callback(message, "");
		}

		const strFile = genAlphaNum(10);
		const ext = file.originalname.split(".").pop();
		const filename = `${path.parse(file.originalname).name}-${strFile}.${ext}`;
		callback(null, filename);
	},
});

const uploadFiles = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
}).fields([{ name: "file", maxCount: 3 }]);

const uploadFilesMiddleware = (req: any, res: any) =>
	new Promise((resolve: any, reject) => {
		uploadFiles(req, res, (err) => {
			if (err) return reject(err);
			resolve();
		});
	});

export default uploadFilesMiddleware;
