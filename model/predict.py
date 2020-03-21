#!/usr/bin/env python3 
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import sys
import argparse
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import json
from tensorflow.keras import backend as K

types = ['ductal', 'lobular', 'mucinous', 'papillary']

def process_image(path):
	### convert image to np array and resize
	img = image.load_img(path, target_size=(700, 460))
	x = image.img_to_array(img)
	x = np.resize(x, (224, 224, 3))
	x = np.expand_dims(x, axis=0)

	return x

def classify(model, img):
	### predict class with loaded model
	images = np.vstack([img])
	confidence = model.predict(images, batch_size=1)[0]
	predicted =  "BENIGN" if (confidence[0] > 0.5) else "MALIGNANT"

	obj = {
		"classification": predicted,
		"class_confidence": float(max(confidence[0], confidence[1])),
	}

	return obj

def predict_type(model, img):
	### predict malignant type with loaded model
	images = np.vstack([img])
	confidences_types = model.predict(images, batch_size=1)
	selected_type = types[np.argmax(confidences_types)]

	obj = {
		"type": selected_type, 
		"type_confidence": np.max(confidences_types)
	}
	
	return obj

parser = argparse.ArgumentParser(description='Classify biopsy images as malignant or benign.')
parser.add_argument('-f','--file', action='store', help='<Required> Set image file path', required=True)
parser.add_argument('-m','--malignant', action='store_true', help='Add if you want malignant type prediction', required=False)
args = parser.parse_args()

K.clear_session()
path = os.path.dirname(os.path.realpath(__file__))
img = process_image(args.file)
if (args.malignant):
	model = load_model(path + '/fourclassweights.h5')
	data = predict_type(model, img)
else:
	model = load_model(path + '/marchweights.h5') 
	data = classify(model, img)
print(data)