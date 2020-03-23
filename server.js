const express = require('express');
const fileUpload = require('express-fileupload');
var bodyParser = require('body-parser')
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

var images = [];
fs.readdir(path.join(__dirname, 'static', 'img', 'benign'), (err, files) => {
	files.forEach(function(file){
		images.push({
			"url": `img/benign/${file}`,
			"class": "benign"
		});
	})
});

fs.readdir(path.join(__dirname, 'static', 'img', 'malignant'), (err, files) => {
	files.forEach(function(file){
		images.push({
			"url": `img/malignant/${file}`,
			"class": "malignant"
		});
	})
});

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('static'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ parameterLimit: 100000, extended: true, limit: '50mb' }));
app.use(fileUpload({
	useTempFiles : true,
	tempFileDir : './static/img/tmp/'
}));

app.get('/', function(req, res) {
	res.render('index', {"images": images});
});

app.post('/classify', function(req, res) {
	if(req.body.preset_path == null && req.files == null){
		res.status(500).json({
			"message": "need to upload an image from dataset or select preset image!"
		});
		return;
	}
	var preset = (req.body.preset_path);
	var filepath = (req.body.preset_path) ? req.body.preset_path : req.files.img.tempFilePath;
	exec(`python3 model/predict.py -f ${filepath}`, (err, stdout, stderr) => {
		if(err){ res.status(500).json({ "message": stderr }); }
		else {
			var json = JSON.parse(stdout.replace(/'/g, '"'));
			if(!preset) json.file_path = req.files.img.tempFilePath.slice(6);
			res.status(200).json(json);
		}
	});
});

const typeStrings = {
	'benign': '',
	'DC': 'Ductal Carcinoma',
	'LC': 'Lobular Carcinoma',
	'MC': 'Mucinous Carcinoma',
	'PC': 'Papillary Carcinoma',
};

const treatments = {
	'benign': [],
	'DC': ['Lumpectomy', 'Mastectomy', 'Chemotherapy', 'Radiation Therapy', 'Hormonal Therapy'],
	'LC': ['Surgery', 'Chemotherapy', 'Radiation Therapy', 'Hormonal Therapy', 'Targeted Therapy'],
	'MC': ['Lumpectomy', 'Chemotherapy', 'Radiation Therapy', 'Hormonal Therapy', 'Mastectomy'],
	'PC': ['Surgery', 'Chemotherapy', 'Radiation Therapy', 'Hormonal Therapy', 'Targeted Therapy']
};

const explanations = {
	'benign': '',
	'DC': 'Ductal carcinoma is a common type of breast cancer that starts in cells in milk ducts.\
		   This type accounts for 80% of invasive breast cancer in women and 90% in men. \
		   <a href="https://www.webmd.com/breast-cancer/ductal-carcinoma-invasive-in-situ#1">More Info</a>',
	'LC': 'Lobular carcinoma is the second most common type of breast cancer and starts in the lobules. \
		   It\'s the most likely to be found in both breasts out of all the types. \
		   <a href="https://www.webmd.com/breast-cancer/lobular-carcinoma-invasive-and-in-situ#1">More Info</a>',
	'MC': 'Mucinous tumors are rare forms of ductal carcinoma and account for 2-3% of breast cancer cases. \
		   The tumor is made up of cells that float in mucin. \
		   <a href="https://www.breastcancer.org/symptoms/types/mucinous">More Info</a>',
	'PC': 'Papillary tumors are rare and account for 2% of breast cancer cases. They are diagnosed in \
		   older women who have already been through menopause. \
		   <a href="https://www.breastcancer.org/symptoms/types/papillary">More Info</a>'
};

app.get('/results/:id', function(req, res) {
	var id = req.params.id;
	var json = JSON.parse(Buffer.from(id, 'base64').toString());
	var benign_pred = json.type == "benign";
	json.confidence = parseFloat((json.confidence * 100).toString().slice(0, 5));
	json.classification = benign_pred ? "BENIGN" : "MALIGNANT";
	json.treatments = treatments[json.type];
	json.explanation = explanations[json.type];
	json.type = typeStrings[json.type];

	var uploaded = json.file_path.substr(0, 3) == "SOB";
	var benign_actual = json.file_path.substr(4, 1) == "b";
	json.expected_class =  benign_actual ? "BENIGN" : "MALIGNANT";
	if (uploaded) json.expected_class = "N/A";
	json.expected_type = (benign_actual || uploaded) ? "" : typeStrings[json.file_path.substr(20, 2)];
	res.render('results', json);
});

var port = 3000;
app.listen(port, () => {
	console.log(`listening on port ${port}...`);
});