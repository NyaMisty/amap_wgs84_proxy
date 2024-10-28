const canvas = require('canvas')
const Image = canvas.Image
Image.prototype.addEventListener = function (type, handler) {
    this['on' + type] = handler.bind(this);
}
Image.prototype.removeEventListener = function (type) {
    this['on' + type] = null;
}

global.Image = Image;
global.Canvas = canvas.Canvas;
global.OffscreenCanvas = canvas.Canvas;
global.WorkerGlobalScope = Object;
global.self = new Object({});

const { Document, SVGElement } = require('nodom');
global.document = new Document();
global.document.createElement_ori = global.document.createElement
global.document.createElement = (name) => {
    if (name === "canvas") {
        return new Canvas(300, 300)
    }
    return global.document.createElement_ori(name)
}
global.SVGElement = SVGElement;

const express = require('express');
const ol = {
    proj: require('ol/proj'),
    layer: require('ol/layer'),
    source: require('ol/source'),
}

import { GCJ02 } from 'ol-proj-ch';
// import CanvasTileLayerRenderer from "ol/renderer/canvas/TileLayer";
// import {TileImage} from "ol/source";
// import {ImageTile} from "ol";
import EventType from 'ol/events/EventType';
import TileState from 'ol/TileState';
// import ReprojTile from "ol/reproj/Tile";

const gcj02Mercator = new ol.proj.Projection({
    code: "gcj02",
    extent: ol.proj.get("EPSG:3857").getExtent(),
    units: "m"
});

const ll2merc = ol.proj.getTransform("EPSG:4326", "EPSG:3857");
const merc2ll = ol.proj.getTransform("EPSG:3857", "EPSG:4326");

ol.proj.addProjection(gcj02Mercator);

ol.proj.addCoordinateTransforms(
    "EPSG:4326",
    gcj02Mercator,
    (x) => {
        var a = GCJ02.fromEPSG4326(x)
        // console.log("GCJ02.fromEPSG4326", x, a)
        return ll2merc(a)
    },
    (x) => {
        var a = merc2ll(x)
        // console.log("merc2ll", x, a)
        return GCJ02.toEPSG4326(a)
    }
);

ol.proj.addCoordinateTransforms(
    "EPSG:3857",
    gcj02Mercator,
    (x) => ll2merc(GCJ02.fromEPSG3857(x)),
    (x) => GCJ02.toEPSG3857(merc2ll(x))
);

function getRenderLayer() {
    let amap_layer = new ol.layer.Tile({
        opacity: 1.0, // let OsmAnd handle transparency
        source: new ol.source.XYZ({
            projection: "gcj02",
            url:
            // "http://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
                "http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8"
        })
    });
    let renderLayer = amap_layer.createRenderer()
    return renderLayer
}

let renderLayer = getRenderLayer()
// reset layer source periodically to avoid too much cache (tile cache is in ol.source.XYZ)
setInterval(function() {
    renderLayer = getRenderLayer()
}, 60000)

async function getTile(x, y, z) {
    // console.log(renderLayer);
    console.log(`getTile: ${x}, ${y}, ${z}`);
    const tile = renderLayer.getTile(z, x, y, {
        pixelRatio: 1.0,
        viewState: {
            projection: ol.proj.get('EPSG:3857')
        }
    })
    // console.log(tile)
    if (tile.getState() !== TileState.LOADED && tile.getState() !== TileState.EMPTY) {
        console.log(`  tile not loaded, reloading...`);
        await new Promise((resolve, reject) => {
            // console.log('add listener')
            var timer = null;
            const handler = (arg0) => {
                const s = tile.getState()
                // console.log("changed", s, TileState.LOADED)
                switch (s) {
                    case TileState.LOADED:
                    case TileState.EMPTY:
                        resolve()
                        clearInterval(timer)
                        break
                    case TileState.ERROR:
                        reject("tile error")
                        clearInterval(timer)
                        break
                    case TileState.IDLE:
                    case TileState.LOADING:
                        break
                }
            }
            tile.addEventListener(EventType.CHANGE, handler)
            // timer = setInterval(handler, 100)
            // console.log('load')
            tile.load()
        })
    }

    console.log(`  tile load finished, status: ${tile.getState()}`);
    const data = tile.getImage();
    return data.toBuffer()
}


// getTile(13662, 6746, 14)

const app = express();

app.get('/appmaptile', async (req, res) => {
    const x = parseInt(req.query.x);
    const y = parseInt(req.query.y);
    const z = parseInt(req.query.z);

    // Your logic here, and send a response, for example:
    // res.send(`x: ${x}, y: ${y}, z: ${z}`);

    const buf = await getTile(x, y, z);

    res.set('Content-Type', 'image/png');
    res.send(buf);
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});