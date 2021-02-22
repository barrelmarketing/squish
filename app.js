// Barrel Image Compression script - cheaper than ShortPixel!

// start timer
console.time("Optimization Timer");
console.log('\n start')

// dependencies
const fs = require('fs-extra')
const fsWalk = require('@nodelib/fs.walk');

const path = require('path')
const sharp = require('sharp')

const sizeOf = require('image-size');
const { resolve } = require('path');
const { formatWithOptions } = require('util');



//dir variables
//TODO: use args to make these dynamic
const wpDir = "/var/www/html";
const srcDir = wpDir + "/wp-content/uploads/ShortpixelBackups/wp-content/uploads";
const trgDir = wpDir + "/wp-content/uploads/BarrelBackups"; 
console.log('compressing files in '+srcDir)

// array of files
let fileList;


// in directory 
async function main(){
    
    
    //get file list
    fsWalk.walk(srcDir, {stats:false}, async (error, entries) => { 
        if(error){
            console.log(error)
            return
        }
        fileList = entries;
        
        //show
        let counter = 0;
        let counter_ignored = 0;
        let promises = [];
        let currentDate = parseInt((new Date().getTime()/1000).toFixed(0));

        function processFile(file,i){

            counter++
            return new Promise(async (resolve,reject)=>{
                if(fs.statSync(file.path).isDirectory()){
                    return resolve('is directory')
                }
                //filter relevant file extensions
                if( path.extname(file.path).includes('jpg') || path.extname(file.path).includes('JPG') ||
                path.extname(file.path).includes('png') || path.extname(file.path).includes('PNG') || 
                path.extname(file.path).includes('JPEG') || path.extname(file.path).includes('jpeg') || 
                path.extname(file.path).includes('TIF') || path.extname(file.path).includes('tif') || 
                path.extname(file.path).includes('TIFF') || path.extname(file.path).includes('tiff') ){          
                    
                        //set extension
                        file.ext = path.extname(file.path)
                   
                        //set Image Dimensions
                        var dim = sizeOf(file.path);
                        file.dim = dim;
    
                        // get filesize
                        file.size = fs.statSync(file.path).size

                        //get filename
                        file.name =file.path.replace(/^.*[\\\/]/, '')
    
                        // set Path to Copy
                        file.path_bkp =__dirname + "/backup/"+ currentDate + file.path.split(srcDir)[1]                        
                        
                        //backup to new path
                        try{
                            await fs.copy(file.path, file.path_bkp).then(async ()=>{

                                // optimize
                                var optImg = await sharp(file.path)
                                
                                if (file.dim.width >1920) {
                                    optImg.resize(1920)
                                }
                                var newImg;
                                
                                if(file.ext.toLowerCase().includes("jpg") || file.ext.toLowerCase().includes("jpeg")){
                                    newImg = optImg.jpeg({
                                        quality: 50
                                    })
                                }
                                if(file.ext.toLowerCase().includes("png")){
                                    newImg = optImg.png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
                                    .withMetadata()
                                }
                                newImg.toFile(file.path_bkp)  
                                    .then(info => {
                                        
                                        // console.log(info)
                                        file.dim_new = { width: info.width, height: info.height };
                                        file.size_new = info.size;
                                        file.info_new = { channels: info.channels, premultiplied: info.premultiplied, format: info.format };
                                        
                                        // console.log(counter, " >> ", file);
                                        console.log('Optimized ' + file.name, "saved", (file.size-file.size_new)/1000, ' KB')
                                        return resolve(file.name+ ' is good')

                                    }).catch(error => {
                                        console.error(error)
                                        return resolve(error);
                                    });
                                 })
                                    //TODO: update db
                                    //TODO: reports
                            }catch(error){
                                // return console.error(err)
                                return reject(error); 
                            }                        
                        
                
                            
                }else{
                    // console.log("irelephant")
                    fileList.splice(i, 1);
                    counter_ignored++;
                    return resolve('is not image');
                }                
            })

         
        }
            
        for(let i = 0; i < fileList.length; i++){  
            var file = fileList[i]
            var status = await processFile(file,i)
            // console.log('status:', status, i)
        }

       
            console.log("all settled:")
            console.log(counter)
            console.log('processed '+ (counter-counter_ignored) + ' items', "\nignored "+ counter_ignored)
            console.timeEnd("Optimization Timer");
       
            // var util = require('util');
            // fs.writeFileSync('./latest.json', util.inspect(fileList) , 'utf-8');

        
    })
    

};


main()
