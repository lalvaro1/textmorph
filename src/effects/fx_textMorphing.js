
class textMorphing extends Default {

    constructor({ctx, guiBuilder}) {

        super({ctx, guiBuilder});

        // ctx: canvas's context
        // guiBuilder: builder to add specific elements to gui (see https://github.com/dataarts/dat.gui/blob/master/API.md)

        // Uncomment lines below to create custom settings

        // // create data model
        // this.mySettings = {
        //     blur: 0.5,
        //     shadowColor: '#0000FF',
        // };
        //
        // // ensure settings are saved upon reloads
        // guiBuilder.remember(this.mySettings);
        //
        // // create menu entries
        // var myFolder = guiBuilder.addFolder('My custom settings');
        // myFolder.add(this.mySettings, 'blur', 0, 1, 0.01)
        // myFolder.addColor(this.mySettings, 'shadowColor');
        this.risingEdgeBuffer = null;
        this.fallingEdgeBuffer = null;        
        this.edge = 0;
        this.wordIndex = 1;
    }

    onKeyDown({key}) {
        // value is printed in console when a key is pressed
    }

    onMouseMoved({position, uv, event}) {
        // position.[xy]: in pixels
        // uv.[uv]: in [0..1] range
        // event: raw browser event with button, modifiers, and more.
    }

    onMouseClicked({position, uv, event}) {
        // position.[xy]: in pixels
        // uv.[uv]: in [0..1] range
        // event: raw browser event with button, modifiers, and more.
    }

    /* Method called each render frame, up to */
    /* 60 times per second on a 60hz monitor  */

    getPixels(canvas, word) {

        this.offsetDrawWord(canvas, word);

        const ctx = canvas.getContext('2d');        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = [];

        let minX = Number.MAX_VALUE;    
        let maxX = Number.MIN_VALUE;            
        let minY = Number.MAX_VALUE;    
        let maxY = Number.MIN_VALUE;            

        for(let y=0; y<canvas.height; y++) {
            for(let x=0; x<canvas.width; x++) {

                const index = (x+y*canvas.width)*4+1;
                const color = imgData.data[index];

                if(color>0) {

                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);                    
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);                    

                    pixels.push({ x, y, color });
                }
            }
        }

        const pixelWidth  = maxX-minX+1;
        const pixelHeight = maxY-minY+1;        

        for(let pixel of pixels) {
            pixel.x -= (minX + pixelWidth/2);
            pixel.y -= (minY + pixelHeight/2);            
        }

        pixels.sort(() => (Math.random() > .5) ? 1 : -1);

        return { pixels, pixelWidth, pixelHeight };
    }

    lerp(v1, v2, ratio) {
        return v2*ratio+v1*(1-ratio);
    }

    length(x, y) {
        return Math.sqrt(x*x+y*y);
    }

    interpolate(pixel1, pixel2, animation) {

        const x = this.lerp(pixel1.x, pixel2.x, animation);
        const y = this.lerp(pixel1.y, pixel2.y, animation);        

        const color = this.lerp(pixel1.color, pixel2.color, animation);

        return { x, y, color };
    }



    /*
    interpolate(pixel1, pixel2, animation) {

        const angle1 = Math.atan2(pixel1.y, pixel1.x);
        const angle2 = Math.atan2(pixel2.y, pixel2.x) + Math.PI * 2;        

        const radius1 = this.length(pixel1.x, pixel1.y);
        const radius2 = this.length(pixel2.x, pixel2.y);        

        const iangle = this.lerp(angle1, angle2, animation);
        const iradius = this.lerp(radius1, radius2, animation);        

        const x = Math.cos(iangle) * iradius;
        const y = Math.sin(iangle) * iradius;

        const color = this.lerp(pixel1.color, pixel2.color, animation);

        return { x, y, color };
    }
    */

    blit(ctx, pixels1, pixels2, X, Y, animation) {

        const maxPixels = Math.max(pixels1.length, pixels2.length);        
        const blackPixel = { x: 0, y: 0, color : 0 };

        for(let n=0; n<maxPixels; n++) {

            let sourcePixel, destinationPixel;

            if(n>=pixels1.length) {
                sourcePixel = blackPixel;
                destinationPixel = pixels2[n];
            }
            else 
            if(n>=pixels2.length) {
                sourcePixel = pixels1[n];                
                destinationPixel = blackPixel;
            }
            else {
                sourcePixel = pixels1[n];
                destinationPixel = pixels2[n];
            }

            const pixel = this.interpolate(sourcePixel, destinationPixel, animation);
            ctx.fillStyle = `rgb(${pixel.color}, ${pixel.color}, ${pixel.color})`;
            ctx.fillRect(X + pixel.x*4, Y + pixel.y*4, 2, 2);
        }
    }

    offsetDrawWord(canvas, text) {

        const offscreenCtx = canvas.getContext('2d');

        offscreenCtx.fillStyle = '#000';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);

        offscreenCtx.fillStyle = '#fff';
        offscreenCtx.font = '30px monospace';
        offscreenCtx.fillText(text, 10, 30);
    }

    clamp(x, v1, v2) {
        return Math.min(Math.max(v1, x), v2);
    }

    render({ctx, time}) {

        const animPeriod = 3.;
        const animTransition = 0.5;

        const animation = 1 - (Math.sin(this.clamp((Math.abs(((time-animPeriod/2)%(animPeriod*2))-animPeriod)-animPeriod/2)*(1/animTransition), -1.57, 1.57)) * 0.5 + 0.5);
        
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        const offscreen = document.createElement('Canvas');
        offscreen.width  = 400;
        offscreen.height = 100;

        const words = [ "Into", "the", "flood", "again", "Same", "old trip", "it was", "back then" ];

        if(this.risingEdgeBuffer == null) {
            this.fallingEdgeBuffer = this.getPixels(offscreen, words[0]);
            this.risingEdgeBuffer = this.getPixels(offscreen, words[1]);

            this.wordIndex = 2;
        }

        if(this.edge == 0 && animation > 0.999) {
            this.edge = 1;
            this.fallingEdgeBuffer = this.getPixels(offscreen, words[(this.wordIndex++)%words.length]);    
        }

        if(this.edge == 1 && animation < 0.001) {
            this.edge = 0;
            this.risingEdgeBuffer =this.getPixels(offscreen, words[(this.wordIndex++)%words.length]);               
        }

        console.log(this.wordIndex);

        this.blit(ctx, this.fallingEdgeBuffer.pixels, this.risingEdgeBuffer.pixels, W/2, H/2, animation);
    }
}

FX.push(textMorphing);
