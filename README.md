# amap_wgs84_proxy

转换高德地图GCJ-02坐标的tile到WGS-84坐标的tile，方便OsmAnd等不支持坐标系转换的软件使用

## 使用方法

```
docker build -t amap_wgs84_proxy .
docker run -it -d --name amap-wgs84-proxy -p 5000:5000 -v $PWD:/workdir amap_wgs84_proxy
```

随后将 `http://XXXXXXX:5000/appmaptile?x={x}&y={y}&z={z}` 填入OsmAnd等软件即可