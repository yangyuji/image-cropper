/**
* author: "oujizeng",
* license: "MIT",
* github: "https://github.com/yangyuji/image-cropper",
* name: "imageCrop.js",
* version: "1.1.3"
*/

(function (root, factory) {
    if (typeof module != 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root['ImageCrop'] = factory();
    }
}(this, function () {

    var ImageCrop = function (option) {
        this.renderTo = document.body;
        this.canvas = document.createElement("canvas");
        this.output = option.output || 2;                // 默认放大一倍，避免高清屏模糊
        this.width = option.width || 200;                       // 截取的宽度
        this.height = option.height || 200;                     // 截取的高度
        this.canvas.width = option.width * this.output;
        this.canvas.height = option.height * this.output;
        this.circle = option.circle || false;
        if (option.width !== option.height && option.circle) {
            throw "需要圆形，但是宽高不一致"
        }
        this.ctx = this.canvas.getContext("2d");
        this.croppingBox = document.createElement("div");
        this.croppingBox.style.visibility = "hidden";
        this.cover = document.createElement("canvas");
        this.type = option.type || "png";
        this.cover.width = document.documentElement.clientWidth;
        this.cover.height = document.documentElement.clientHeight;
        this.cover_ctx = this.cover.getContext("2d");
        this.img = document.createElement("img");

        if(option.image_src.substring(0,4).toLowerCase()==='http') {
            this.img.crossOrigin = 'anonymous';//resolve base64 uri bug in safari:"cross-origin image load denied by cross-origin resource sharing policy."
        }
        this.cancel = option.cancel;
        this.ok = option.ok;

        this.ok_text = option.ok_text || "确定";
        this.cancel_text = option.cancel_text || "取消";

        this.croppingBox.appendChild(this.img);
        this.croppingBox.appendChild(this.cover);
        this.renderTo.appendChild(this.croppingBox);
        this.img.onload = this.init.bind(this);
        this.img.src = option.image_src;

        this.cancel_btn = document.createElement('a');
        this.cancel_btn.innerHTML = this.cancel_text;
        this.ok_btn = document.createElement('a');
        this.ok_btn.innerHTML = this.ok_text;

        this.croppingBox.appendChild(this.ok_btn);
        this.croppingBox.appendChild(this.cancel_btn);
    };

    ImageCrop.prototype = {
        version: '1.1.3',
        init: function () {

            this.currentMoveX = 0;                           // 横向动画已经滑动距离
            this.currentMoveY = 0;                           // 竖向动画已经滑动距离
            this.naturalHeight = this.img.height;            // 图片原始高度
            this.naturalWidth = this.img.width;              // 图片原始宽度

            var scaling_x = window.innerWidth / this.img.width,
                scaling_y = window.innerHeight / this.img.height;
            var tmpScale = scaling_x > scaling_y ?  scaling_y : scaling_x; // 图片当前缩放比例，取小值

            var h = this.img.height * tmpScale;
            var w = this.img.width * tmpScale;
            this.img.style.width = w + 'px';
            this.img.style.height = h + 'px';

            this.currentWidth = w;  // 图片当前宽度
            this.currentHeight = h; // 图片当前高度
            this.pinchMoveX = 0;    // 缩放纠正偏移
            this.pinchMoveY = 0;    // 缩放纠正偏移

            this.renderCover();
            this.setStyle();
            this._bindTouch.call(this);
        },
        _bindTouch: function () {
            // Hammer.js init
            var hammer = new Hammer(this.croppingBox);
            hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL }); // 拖动所有方向
            hammer.get('pinch').set({ enable: true });                  // 可以缩放
            hammer.get('rotate').set({ enable: true });                 // 可以旋转

            var self = this;
            // 拖动处理
            hammer.on('panmove', function(evt) {
                var x = self.currentMoveX + evt.deltaX;
                var y = self.currentMoveY + evt.deltaY;
                self.img.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
                evt.preventDefault();
            });
            hammer.on('panend', function(evt) {
                self.currentMoveX += evt.deltaX;
                self.currentMoveY += evt.deltaY;
                self.img.style.transform = 'translate(' + self.currentMoveX + 'px, ' + self.currentMoveY + 'px)';
                evt.preventDefault();
            });

            // 缩放处理
            hammer.on('pinchmove', function(evt) {
                //TOOL.showToast(self.currentWidth + ',' + self.currentHeight);
                // 偏移位置，保持居中
                if (evt.scale != 1) {
                    self.pinchMoveX = self.currentWidth * (1 - evt.scale) / 2;
                    self.pinchMoveY = self.currentHeight * (1 - evt.scale) / 2;
                    var x = self.currentMoveX + self.pinchMoveX;
                    var y = self.currentMoveY + self.pinchMoveY;
                    self.img.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
                }
                var tmp_w = self.currentWidth * evt.scale;
                var tmp_h = self.currentHeight * evt.scale;
                self.img.style.width = tmp_w + 'px';
                self.img.style.height = tmp_h + 'px';

                evt.preventDefault();
            });
            hammer.on('pinchend', function(evt) {
                // 纠正current图片大小
                self.currentWidth = self.img.width;
                self.currentHeight = self.img.height;

                self.currentMoveX += self.pinchMoveX;
                self.currentMoveY += self.pinchMoveY;

                // 还原变量
                self.pinchMoveX = 0;
                self.pinchMoveY = 0;
                evt.preventDefault();
            });

            //hammer.get('tap').set({ enable: true });
            hammer.on('tap', function (evt) {
                if (evt.target.innerText == self.ok_text) {
                    //console.log(evt);
                    self._ok.call(self);
                }
                if (evt.target.innerText == self.cancel_text) {
                    self._cancel.call(self);
                }
            });
        },
        _cancel: function () {
            this._css(this.croppingBox, {
                display: "none"
            });
            this.cancel();
        },
        _ok: function () {
            this.crop();
            this._css(this.croppingBox, {
                display: "none"
            });
            this.ok(this.canvas.toDataURL("image/" + this.type), this.canvas);
        },
        renderCover: function () {
            var ctx = this.cover_ctx,
                w = this.cover.width,
                h = this.cover.height,
                cw = this.width,
                ch = this.height;
            ctx.save();

            ctx.fillStyle = "black";
            ctx.globalAlpha = 0.7;
            ctx.fillRect(0, 0, this.cover.width, this.cover.height);
            ctx.restore();
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";

            ctx.beginPath();
            if (this.circle) {
                ctx.arc(w / 2, h / 2, cw / 2 - 4, 0, Math.PI * 2, false);
            } else {
                ctx.rect(w / 2 - cw / 2, h / 2 - ch / 2, cw, ch)
            }
            ctx.fill();
            ctx.restore();
            ctx.save();

            ctx.beginPath();
            ctx.strokeStyle = "white";
            if (this.circle) {
                ctx.arc(w / 2, h / 2, cw / 2 - 4, 0, Math.PI * 2, false);
            } else {
                ctx.rect(w / 2 - cw / 2, h / 2 - ch / 2, cw, ch)
            }
            ctx.stroke();
        },
        setStyle: function () {
            this._css(this.cover, {
                position: "fixed",
                zIndex: "100",
                left: "0px",
                top: "0px",
                bottom: "0px"
            });

            this._css(this.croppingBox, {
                color: "white",
                textAlign: "center",
                fontSize: "18px",
                textDecoration: "none",
                visibility: "visible"
            });

            this._css(this.img, {
                position: "absolute",
                zIndex: "99",
                left: "50%",
                // error position in meizu when set the top  50%
                top: window.innerHeight / 2 + "px",
                marginLeft: this.currentWidth / -2 + "px",
                marginTop: this.currentHeight / -2 + "px"
            });


            this._css(this.ok_btn, {
                position: "fixed",
                zIndex: "101",
                width: "120px",
                right: "50px",
                lineHeight: "40px",
                height: "40px",
                bottom: "20px",
                borderRadius: "5px",
                backgroundColor: "#f32e37",
                color: "#fff"
            });

            this._css(this.cancel_btn, {
                position: "fixed",
                zIndex: "101",
                width: "120px",
                height: "40px",
                lineHeight: "40px",
                left: "50px",
                bottom: "20px",
                borderRadius: "5px",
                backgroundColor: "#f3f3f3",
                color: "#333"
            });
        },
        crop: function () {
            var cr = this.img.getBoundingClientRect();

            // 获取当前缩放比例
            var scaling_x = this.img.width / this.naturalWidth,
                scaling_y = this.img.height / this.naturalHeight;
            var _scale = scaling_x > scaling_y ?  scaling_y : scaling_x; // 图片当前缩放比例，取小值
            console.log(_scale);

            // 截取框的起始位置
            var camera_left = window.innerWidth / 2 - this.width / 2;
            var camera_top = window.innerHeight / 2 - this.height / 2;

            // 截取框rect
            var cover_rect = [camera_left, camera_top, this.width + camera_left, this.height + camera_top];
            console.log('cover_rect', cover_rect);

            // 图片框rect
            var img_rect = [cr.left, cr.top, cr.right, cr.bottom];
            console.log('img_rect', img_rect);

            var intersect_rect = this.getOverlap.apply(this, cover_rect.concat(img_rect));
            console.log('intersect_rect', intersect_rect);

            var left = (intersect_rect[0] - img_rect[0]) / _scale;
            var top = (intersect_rect[1] - img_rect[1]) / _scale;
            var height = intersect_rect[2] / _scale;
            var width = intersect_rect[3] / _scale;
            console.log(left + ',' + top + ',' + height + ',' + width);

            if (left < 0) left = 0;
            if (top < 0) top = 0;
            if (height > this.naturalWidth) height = this.naturalWidth - left;
            if (width > this.naturalHeight) width = this.naturalHeight - top;

            if (typeof left == 'NaN') {
                throw 'error'
            }
            //console.log('crop_rect', [left, top, width, height]);
            this.ctx.drawImage(this.img, left, top, width, height, 0, 0, this.canvas.width, this.canvas.height);
        },
        // top left (x1,y1) and bottom right (x2,y2) coordination
        getOverlap: function (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
            if (ax2 < bx1 || ay2 < by1 || ax1 > bx2 || ay1 > by2) return [0, 0, 0, 0];

            var left = Math.max(ax1, bx1);
            var top = Math.max(ay1, by1);
            var right = Math.min(ax2, bx2);
            var bottom = Math.min(ay2, by2);
            return [left, top, right - left, bottom - top]
        },
        _css: function (el, obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    el.style[key] = obj[key];
                }
            }
        }
    };

    return ImageCrop;

}));