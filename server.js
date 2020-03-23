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

app.get('/results/:id', function(req, res) {
	var id = req.params.id;
	var json = JSON.parse(Buffer.from(id, 'base64').toString());
	var benign_pred = json.type == "benign";
	json.confidence = parseFloat((json.confidence * 100).toString().slice(0, 5));
	json.classification = benign_pred ? "BENIGN" : "MALIGNANT";
	json.type = typeStrings[json.type];

	var benign_actual = json.file_path.substr(4, 1) == "b";
	json.expected_class =  benign_actual ? "BENIGN" : "MALIGNANT"
	json.expected_type = benign_actual ? "" : typeStrings[json.file_path.substr(20, 2)];
	res.render('results', json);
});

var port = 3000;
app.listen(port, () => {
	console.log(`listening on port ${port}...`);
});