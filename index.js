import faceapi from "face-api.js";
import fs from 'fs';
import { canvas, faceDetectionOptions } from "./commons/index.js";
export const faceDetectionNet = faceapi.nets.ssdMobilenetv1;

import express from "express";
import axios from "axios";
const app = express();
const port = 3000;

app.get("/product-detection", (req, res) => {
    productsFaceDetect(req, res);
});

app.get("/image-url-detection", (req, res) => {
    dectectFaceImageUrl(req, res);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

async function productsFaceDetect(req, res) {
    const response = await axios.get(
        "https://api.printerval.com/product?embeds=categories&filters=categories.category_id=7,product.status=ACTIVE&fields=id&page_size=10"
    );
    

    const pageCount = response.data.meta.page_count;

    for (let j = 0; j < pageCount; j++) {
        // const resProducts = await axios.get(
        //     "https://api.printerval.com/product/8645"
        // );
        const resProducts = await axios.get(
            "https://api.printerval.com/product?embeds=categories&filters=categories.category_id=7,product.status=ACTIVE&fields=id&page_size=10&page_id=" +
                j
        );
        const data = resProducts.data.result;
        let result = [];
        for (let index = 0; index < data.length; index++) {
            const product = data[index];
            if (product.variant_default.image_url) {
                const imageUrl = product.variant_default.image_url.replace(
                    "https://",
                    ""
                );
                const resDetections = await faceDetect(
                    "https://cdn.printerval.com/unsafe/1260x0/filters:format(jpg)/" +
                        imageUrl
                );
                if (resDetections.length > 0) {
                    let isRealFace = false;
                    resDetections.forEach((detection) => {
                        if (detection._box._y < 200 && detection._score > 0.9) {
                            isRealFace = true;
                        }
                    });
                    if (isRealFace) {
                        result.push({
                            product_id: product.id,
                            res: resDetections,
                        });
                        fs.appendFile(
                            "log.txt",
                            product.id + ", ",
                            function (err) {
                                if (err) throw err;
                                console.log("Saved!");
                            }
                        );
                    }
                }
            }
        }
    }

    res.json(result);
}

async function dectectFaceImageUrl (req, res) {
    const imageUrl = req.query.image_url;
    const detections = await faceDetect(imageUrl);
    res.json(detections);
}

async function faceDetect(imageUrl) {
    await faceDetectionNet.loadFromDisk("./weights");
    const img = await canvas.loadImage(imageUrl);
    const detections = await faceapi.detectAllFaces(img, faceDetectionOptions);
    return detections;
}
