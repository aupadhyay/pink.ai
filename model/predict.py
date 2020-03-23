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

types = ['DC', 'LC', 'MC', 'PC', 'benign']

def process_image(path):
	### convert image to np array and resize
	img = image.load_img(path, target_size=(700, 460))
	x = image.img_to_array(img)
	x = np.resize(x, (224, 224, 3))
	x = np.expand_dims(x, axis=0)

	return x

def predict_type(model, img):
	### predict malignant type with loaded model
	images = np.vstack([img])
	confidences_types = model.predict(images, batch_size=1)
	selected_type = types[np.argmax(confidences_types)]

	obj = {
		"type": selected_type,
		"confidence": np.max(confidences_types)
	}

	return obj

parser = argparse.ArgumentParser(description='Classify biopsy images as malignant or benign.')
parser.add_argument('-f','--file', action='store', help='<Required> Set image file path', required=True)
args = parser.parse_args()

K.clear_session()
path = os.path.dirname(os.path.realpath(__file__))
img = process_image(args.file)
model = load_model(path + '/fiveweights.h5')
data = predict_type(model, img)
print(data)