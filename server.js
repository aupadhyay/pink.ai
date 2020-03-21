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

app.post('/analyze_malignant', function(req, res) {
	if(req.body.preset_path == null && req.files == null){
		res.status(500).json({
			"message": "need to upload an image from dataset or select preset image!"
		});
		return;
	}
	var preset = (req.body.preset_path);
	var filepath = (req.body.preset_path) ? req.body.preset_path : req.files.img.tempFilePath;

	exec(`python3 model/predict.py -m -f ${filepath}`, (err, stdout, stderr) => {
		if(err){ res.status(500).json({ "message": stderr }); }
		else {
			var json = JSON.parse(stdout.replace(/'/g, '"'));
			res.status(200).json(json);
		}
	});
});

const typeStrings = {
	'ductal': 'Ductal Carcinoma',
	'lobular': 'Lobular Carcinoma',
	'mucinous': 'Mucinous Carcinoma',
	'papillary': 'Papillary Carcinoma'
};

app.get('/results/:id', function(req, res) {
	var id = req.params.id;
	var json = JSON.parse(Buffer.from(id, 'base64').toString());
	var numDigits = 4;
	json.class_confidence = parseFloat((json.class_confidence * 100).toString().slice(0, 5));
	json.type_confidence = parseFloat((json.type_confidence * 100).toString().slice(0, 5));
	json.type = typeStrings[json.type];
	res.render('results', json);
});

app.listen(3000, () => {
	console.log("listening on port 3000...");
});