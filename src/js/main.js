lucide.createIcons();
// 状態管理

        let map;

        let markers = [];

        let photoDataList = [];

        const PHOTOS_PER_PAGE = 3; 

        

        let tableHeaders = {

            1: "工種・種別",

            2: "測点・位置",

            3: "撮影日時",

            4: "GPS座標",

            5: "備考・説明"

        };

        let projectLabelText = "工事名：";



        // 履歴管理

        let appHistory = [];

        let currentHistoryIndex = -1;

        const MAX_HISTORY = 10;



        // 地図初期化

        function initMap() {

            map = L.map('map').setView([36.2048, 138.2529], 5);

            const tileOptions = {

                attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',

                maxNativeZoom: 18,

                maxZoom: 22,

                keepBuffer: 8

            };

            

            const gsiStd = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', tileOptions);

            const gsiPale = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', tileOptions);

            const gsiOrtho = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg', tileOptions);



            const baseMaps = {

                "地理院地図（標準）": gsiStd,

                "地理院地図（淡色）": gsiPale,

                "地理院地図（航空写真）": gsiOrtho

            };



            gsiOrtho.addTo(map);

            L.control.layers(baseMaps).addTo(map);

        }

        initMap();



        let saveTimeout;

        function requestSave() {

            clearTimeout(saveTimeout);

            saveTimeout = setTimeout(saveData, 800);

        }



        async function saveData() {

            if (photoDataList.length === 0) return;

            if (typeof localforage === 'undefined') return;

            try {

                const appData = {

                    photoDataList: photoDataList,

                    tableHeaders: tableHeaders,

                    projectLabelText: projectLabelText,

                    projectName: document.getElementById('project-name').value

                };

                await localforage.setItem('photoReportData', appData);

                showToast("自動保存しました");

            } catch (err) {

                console.error("保存エラー:", err);

            }

        }



        async function loadData() {

            try {

                if (typeof localforage === 'undefined') return;

                const appData = await localforage.getItem('photoReportData');

                if (appData && appData.photoDataList && appData.photoDataList.length > 0) {

                    photoDataList = appData.photoDataList;

                    if (appData.tableHeaders) tableHeaders = appData.tableHeaders;

                    if (appData.projectLabelText) projectLabelText = appData.projectLabelText;

                    

                    const projectNameInput = document.getElementById('project-name');

                    projectNameInput.value = appData.projectName || "";

                    const displays = document.querySelectorAll('.project-name-display');

                    displays.forEach(el => el.textContent = appData.projectName || "工事名未入力");



                    document.getElementById('empty-state').style.display = 'none';

                    updateMap();

                    renderReport();

                    updateZoomVisibility();

                    fitZoomToScreen(true);

                    showToast("前回の編集データを復元しました");

                }

            } catch (err) {

                console.error("読み込みエラー:", err);

            } finally {

                pushState(true);

            }

        }



        window.pushState = function(isInitial = false) {

            const state = {

                photoDataList: JSON.parse(JSON.stringify(photoDataList)),

                tableHeaders: JSON.parse(JSON.stringify(tableHeaders)),

                projectLabelText: projectLabelText,

                projectName: document.getElementById('project-name').value

            };



            if (currentHistoryIndex < appHistory.length - 1) {

                appHistory = appHistory.slice(0, currentHistoryIndex + 1);

            }



            appHistory.push(state);

            if (appHistory.length > MAX_HISTORY) appHistory.shift();

            else currentHistoryIndex++;

            

            updateUndoRedoUI();

            if (!isInitial) requestSave();

        };



        function restoreState(state) {

            photoDataList = JSON.parse(JSON.stringify(state.photoDataList));

            tableHeaders = JSON.parse(JSON.stringify(state.tableHeaders));

            projectLabelText = state.projectLabelText;

            

            const projectNameInput = document.getElementById('project-name');

            projectNameInput.value = state.projectName;

            const displays = document.querySelectorAll('.project-name-display');

            displays.forEach(el => el.textContent = state.projectName || "工事名未入力");



            updateMap();

            renderReport();

            updateZoomVisibility();

            updateSortButtonsVisibility();

            

            if (photoDataList.length === 0) {

                document.getElementById('empty-state').style.display = 'flex';

                const warningEl = document.getElementById('no-location-warning');

                if (warningEl) {

                    warningEl.classList.add('hidden');

                    warningEl.classList.remove('flex');

                }

            } else {

                document.getElementById('empty-state').style.display = 'none';

            }

            requestSave();

        }



        window.undo = function() {

            if (currentHistoryIndex > 0) {

                currentHistoryIndex--;

                restoreState(appHistory[currentHistoryIndex]);

                updateUndoRedoUI();

                showToast("元に戻しました");

            }

        };



        window.redo = function() {

            if (currentHistoryIndex < appHistory.length - 1) {

                currentHistoryIndex++;

                restoreState(appHistory[currentHistoryIndex]);

                updateUndoRedoUI();

                showToast("やり直しました");

            }

        };



        function updateUndoRedoUI() {

            const undoBtn = document.getElementById('btn-undo');

            const redoBtn = document.getElementById('btn-redo');

            if (!undoBtn || !redoBtn) return;

            undoBtn.disabled = currentHistoryIndex <= 0;

            redoBtn.disabled = currentHistoryIndex >= appHistory.length - 1;

        }



        document.addEventListener('keydown', function(e) {

            const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

            if (isInput) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }

        });



        function showToast(message) {

            const toast = document.getElementById('toast');

            const msgEl = document.getElementById('toast-message');

            if(!toast || !msgEl) return;

            msgEl.textContent = message;

            toast.classList.remove('opacity-0');

            setTimeout(() => toast.classList.add('opacity-0'), 2500);

        }



        window.addEventListener('DOMContentLoaded', () => loadData());



        const dropZone = document.getElementById('drop-zone');

        const fileInput = document.getElementById('file-input');

        const emptyState = document.getElementById('empty-state');

        const loadingOverlay = document.getElementById('loading-overlay');

        const loadingText = document.getElementById('loading-text');

        const globalDropOverlay = document.getElementById('global-drop-overlay');



        dropZone.addEventListener('click', () => fileInput.click());



        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {

            document.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);

        });



        document.addEventListener('dragenter', e => {

            if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {

                globalDropOverlay.classList.remove('hidden');

                globalDropOverlay.classList.add('flex');

            }

        });

        document.addEventListener('dragover', e => {

            if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {

                globalDropOverlay.classList.remove('hidden');

                globalDropOverlay.classList.add('flex');

            }

        });

        document.addEventListener('dragleave', e => {

            if (e.relatedTarget === null || e.relatedTarget.nodeName === 'HTML') {

                globalDropOverlay.classList.add('hidden');

                globalDropOverlay.classList.remove('flex');

            }

        });

        document.addEventListener('drop', e => {

            globalDropOverlay.classList.add('hidden');

            globalDropOverlay.classList.remove('flex');

            handleFiles(e.dataTransfer.files);

        });

        

        fileInput.addEventListener('change', function() {

            handleFiles(this.files);

            this.value = '';

        });



        window.clearAllData = function() {

            if (photoDataList.length === 0) return;

            document.getElementById('confirm-modal').classList.remove('hidden');

            document.getElementById('confirm-modal').classList.add('flex');

        };



        window.closeConfirmModal = function() {

            document.getElementById('confirm-modal').classList.add('hidden');

            document.getElementById('confirm-modal').classList.remove('flex');

        };



        window.showAlertModal = function(message) {

            document.getElementById('alert-modal-message').textContent = message;

            document.getElementById('alert-modal').classList.remove('hidden');

            document.getElementById('alert-modal').classList.add('flex');

        };



        window.closeAlertModal = function() {

            document.getElementById('alert-modal').classList.add('hidden');

            document.getElementById('alert-modal').classList.remove('flex');

        };



        window.executeClearAll = async function() {

            closeConfirmModal();

            photoDataList = [];

            clearSelection();

            clearMarkers();

            map.setView([36.2048, 138.2529], 5);

            isManualZoomed = false;

            

            const warningEl = document.getElementById('no-location-warning');

            if (warningEl) {

                warningEl.classList.add('hidden');

                warningEl.classList.remove('flex');

            }

            

            renderReport();

            updateZoomVisibility();

            

            const emptyState = document.getElementById('empty-state');

            if (emptyState) emptyState.style.display = 'flex';

            

            document.getElementById('file-input').value = '';

            

            if (typeof localforage !== 'undefined') {

                await localforage.removeItem('photoReportData');

            }

            pushState();

            showToast("データをクリアしました");

        };



        function confirmDuplicate(duplicateNames) {

            return new Promise((resolve) => {

                const modal = document.getElementById('duplicate-confirm-modal');

                const msgEl = document.getElementById('duplicate-modal-message');

                msgEl.innerHTML = `以下の写真はすでに追加されている可能性があります。<br><br><b class="text-blue-600">${duplicateNames.join('<br>')}</b><br><br>重複して追加しますか？`;

                

                const btnYes = document.getElementById('duplicate-btn-yes');

                const btnNo = document.getElementById('duplicate-btn-no');

                

                const newBtnYes = btnYes.cloneNode(true);

                const newBtnNo = btnNo.cloneNode(true);

                btnYes.parentNode.replaceChild(newBtnYes, btnYes);

                btnNo.parentNode.replaceChild(newBtnNo, btnNo);



                newBtnYes.addEventListener('click', () => {

                    modal.classList.add('hidden');

                    modal.classList.remove('flex');

                    resolve(true);

                });

                newBtnNo.addEventListener('click', () => {

                    modal.classList.add('hidden');

                    modal.classList.remove('flex');

                    resolve(false);

                });



                modal.classList.remove('hidden');

                modal.classList.add('flex');

            });

        }



        async function handleFiles(files) {

            const imageFiles = Array.from(files).filter(file => {

                const type = file.type.toLowerCase();

                const name = file.name.toLowerCase();

                return type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png' || type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');

            });

            

            if (imageFiles.length === 0) {

                showAlertModal('JPEG、PNG、または HEIC 形式の画像ファイルを選択してください。');

                return;

            }



            let duplicateFiles = [];

            let uniqueFiles = [];

            for (const file of imageFiles) {

                const isDuplicate = photoDataList.some(p => p.filename === file.name && (p.size === undefined || p.size === file.size));

                if (isDuplicate) duplicateFiles.push(file);

                else uniqueFiles.push(file);

            }



            let finalFiles = uniqueFiles;

            if (duplicateFiles.length > 0) {

                const duplicateNames = duplicateFiles.map(f => f.name);

                const shouldAdd = await confirmDuplicate(duplicateNames);

                if (shouldAdd) finalFiles = imageFiles;

            }



            if (finalFiles.length === 0) return;



            emptyState.style.display = 'none';

            loadingOverlay.classList.add('active');

            

            const isFirstLoad = photoDataList.length === 0;

            let failedHeicFiles = []; 



            for (let i = 0; i < finalFiles.length; i++) {

                let originalFile = finalFiles[i];

                let fileToProcess = finalFiles[i];

                let isHeic = false;



                const type = fileToProcess.type.toLowerCase();

                const name = fileToProcess.name.toLowerCase();

                if (type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')) {

                    isHeic = true;

                    loadingText.innerText = `HEIC形式を変換中... (${i + 1} / ${finalFiles.length})`;

                    try {

                        const blobResult = await heic2any({

                            blob: fileToProcess,

                            toType: "image/jpeg",

                            quality: 0.8,

                            multiple: true

                        });

                        const blob = Array.isArray(blobResult) ? blobResult[0] : blobResult;

                        const newName = fileToProcess.name.replace(/\.heic|\.heif/i, '.jpg');

                        fileToProcess = new File([blob], newName, { type: "image/jpeg" });

                    } catch (err) {

                        failedHeicFiles.push(originalFile.name);

                        continue;

                    }

                }



                loadingText.innerText = `写真を解析中... (${i + 1} / ${finalFiles.length})`;

                try {

                    const data = await processSingleFile(fileToProcess, isHeic ? originalFile : null, originalFile.name, originalFile.size);

                    data.id = photoDataList.length + 1; 

                    photoDataList.push(data);

                } catch (error) {

                    console.error("ファイル処理エラー:", error);

                }

            }



            loadingOverlay.classList.remove('active');

            

            if (failedHeicFiles.length > 0) {

                showAlertModal(`【HEIC読み込みスキップ】\n以下の写真の変換に失敗したためスキップしました。\n\n${failedHeicFiles.join('\n')}\n\n※Live Photosや一部の最新iOSフォーマットはブラウザ上で変換できない場合があります。`);

            }

            

            updateMap();

            renderReport();

            updateZoomVisibility();

            if (isFirstLoad && photoDataList.length > 0) fitZoomToScreen(true);

            pushState();

        }



        function readFileAsDataURL(file) {

            return new Promise((resolve, reject) => {

                const reader = new FileReader();

                reader.onload = e => resolve(e.target.result);

                reader.onerror = reject;

                reader.readAsDataURL(file);

            });

        }



        function extractExifData(file) {

            return new Promise(resolve => {

                EXIF.getData(file, function() {

                    resolve(EXIF.getAllTags(this));

                });

            });

        }



        function resizeAndCompressImage(dataUrl, maxWidth = 1200, maxHeight = 1200) {

            return new Promise((resolve, reject) => {

                const img = new Image();

                img.onload = () => {

                    let width = img.width;

                    let height = img.height;

                    if (width > height) {

                        if (width > maxWidth) {

                            height = Math.round(height * (maxWidth / width));

                            width = maxWidth;

                        }

                    } else {

                        if (height > maxHeight) {

                            width = Math.round(width * (maxHeight / height));

                            height = maxHeight;

                        }

                    }

                    const canvas = document.createElement('canvas');

                    canvas.width = width;

                    canvas.height = height;

                    const ctx = canvas.getContext('2d');

                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', 0.75));

                };

                img.onerror = reject;

                img.src = dataUrl;

            });

        }



        function convertDMSToDD(degrees, minutes, seconds, direction) {

            if (degrees === undefined || degrees === null) return NaN;

            let d = Number(degrees);

            let m = Number(minutes);

            let s = Number(seconds);

            if (isNaN(d) || isNaN(m) || isNaN(s)) return NaN;

            let dd = d + m/60 + s/(60*60);

            if (direction == "S" || direction == "W") dd = dd * -1;

            return dd;

        }



        function parseExifLocation(exifData) {

            let lat = null, lng = null;

            if (exifData.GPSLatitude && exifData.GPSLongitude && exifData.GPSLatitude.length >= 3 && exifData.GPSLongitude.length >= 3) {

                let parsedLat = convertDMSToDD(exifData.GPSLatitude[0], exifData.GPSLatitude[1], exifData.GPSLatitude[2], exifData.GPSLatitudeRef);

                let parsedLng = convertDMSToDD(exifData.GPSLongitude[0], exifData.GPSLongitude[1], exifData.GPSLongitude[2], exifData.GPSLongitudeRef);

                if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && !(parsedLat === 0 && parsedLng === 0)) {

                    lat = parsedLat;

                    lng = parsedLng;

                }

            }

            return { lat, lng };

        }



        function parseExifDate(exifData) {

            let dateStr = "日時情報なし";

            if (exifData.DateTimeOriginal) {

                const parts = exifData.DateTimeOriginal.split(' ');

                if(parts.length === 2) {

                    const ymd = parts[0].replace(/:/g, '/');

                    const hm = parts[1].substring(0, 5);

                    const dateObj = new Date(ymd);

                    

                    let eraStr = "";

                    let dayOfWeek = "";

                    if (!isNaN(dateObj.getTime())) {

                        const y = dateObj.getFullYear();

                        const m = dateObj.getMonth() + 1;

                        const d = dateObj.getDate();

                        if (y > 2019 || (y === 2019 && m >= 5)) eraStr = `(R${y - 2018})`;

                        else if (y > 1989 || (y === 1989 && (m > 1 || (m === 1 && d >= 8)))) eraStr = `(H${y - 1988})`;

                        const days = ['日', '月', '火', '水', '木', '金', '土'];

                        dayOfWeek = days[dateObj.getDay()];

                    }

                    

                    const ymdParts = ymd.split('/');

                    const formattedYmd = ymdParts.length === 3 ? `${ymdParts[0]}${eraStr}/${ymdParts[1]}/${ymdParts[2]}` : ymd;

                    dateStr = dayOfWeek ? `${formattedYmd} (${dayOfWeek}) ${hm}` : `${formattedYmd} ${hm}`;

                } else {

                    dateStr = exifData.DateTimeOriginal;

                }

            }

            return dateStr;

        }



        async function processSingleFile(fileToReadImage, fileToReadExif = null, originalFilename = null, originalSize = null) {

            const exifSourceFile = fileToReadExif || fileToReadImage;

            try {

                const originalDataUrl = await readFileAsDataURL(fileToReadImage);

                const exifData = await extractExifData(exifSourceFile);

                const { lat, lng } = parseExifLocation(exifData);

                const dateStr = parseExifDate(exifData);

                

                let direction = null;

                if (exifData.GPSImgDirection != null) {

                    let dir = Number(exifData.GPSImgDirection);

                    if (!isNaN(dir) && (exifData.GPSImgDirectionRef || dir !== 0)) direction = dir;

                }



                let compressedDataUrl = originalDataUrl;

                try {

                    compressedDataUrl = await resizeAndCompressImage(originalDataUrl);

                } catch (e) {

                    console.warn("画像圧縮失敗:", e);

                }



                return {

                    filename: originalFilename || fileToReadImage.name,

                    size: originalSize || fileToReadImage.size,

                    dataUrl: compressedDataUrl, 

                    pureDataUrl: compressedDataUrl, // 完全な初期画像

                    markupDataUrl: null, // 書き込み専用レイヤー（透過PNG）

                    lat: lat,

                    lng: lng,

                    date: dateStr,

                    direction: direction,

                    koshu: '',

                    sokuten: '',

                    bikou: '',

                    selected: false,

                    adjustments: { brightness: 100, contrast: 100, saturate: 100 }

                };

            } catch (error) {

                console.error("ファイル処理エラー:", error);

                throw error;

            }

        }



        // 写真レイヤー（元画像 ＋ 色補正 ＋ 書き込み）を合成して dataUrl を再生成する

        window.rebuildPhotoDataUrl = function(photo) {

            return new Promise((resolve, reject) => {

                if (!photo.pureDataUrl) photo.pureDataUrl = photo.originalDataUrl || photo.dataUrl;

                

                const img = new Image();

                img.onload = () => {

                    const canvas = document.createElement('canvas');

                    canvas.width = img.width;

                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');

                    

                    // 色調補正の適用

                    const { brightness = 100, contrast = 100, saturate = 100 } = photo.adjustments || {};

                    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    ctx.filter = 'none'; // フィルタをリセット

                    

                    // 書き込みレイヤーの合成

                    if (photo.markupDataUrl) {

                        const markupImg = new Image();

                        markupImg.onload = () => {

                            ctx.drawImage(markupImg, 0, 0, canvas.width, canvas.height);

                            photo.dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                            resolve(photo.dataUrl);

                        };

                        markupImg.onerror = () => {

                            photo.dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                            resolve(photo.dataUrl);

                        };

                        markupImg.src = photo.markupDataUrl;

                    } else {

                        photo.dataUrl = canvas.toDataURL('image/jpeg', 0.9);

                        resolve(photo.dataUrl);

                    }

                };

                img.onerror = reject;

                img.src = photo.pureDataUrl;

            });

        };



        function clearMarkers() {

            markers.forEach(m => map.removeLayer(m));

            markers = [];

        }



        function updateMap(shouldFitBounds = true) {

            clearMarkers();

            const bounds = L.latLngBounds();

            let hasLocation = false;

            let noLocationPhotos = [];

            let hasDirection = false;



            photoDataList.forEach(photo => {

                const isValidLocation = typeof photo.lat === 'number' && Number.isFinite(photo.lat) && typeof photo.lng === 'number' && Number.isFinite(photo.lng) && !(photo.lat === 0 && photo.lng === 0);



                if (isValidLocation) {

                    hasLocation = true;

                    let directionHtml = '';

                    if (typeof photo.direction === 'number' && Number.isFinite(photo.direction)) {

                        hasDirection = true;

                        directionHtml = `

                        <div style="position:absolute; top:0; left:0; width:36px; height:36px; transform: rotate(${photo.direction}deg); transition: transform 0.3s; pointer-events:none; z-index:1;">

                            <svg style="position:absolute; top:-6px; left:50%; transform:translateX(-50%); filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));" width="16" height="20" viewBox="0 0 24 32">

                                <path d="M12 0 L24 14 L16 14 L16 32 L8 32 L8 14 L0 14 Z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>

                            </svg>

                        </div>`;

                    }



                    const icon = L.divIcon({

                        className: 'custom-marker',

                        html: `<div style="position:relative; width:36px; height:36px;">

                                ${directionHtml}

                                <div style="position:absolute; top:6px; left:6px; background-color:#2563eb; color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3); z-index:2;">

                                 ${photo.id}

                                </div>

                               </div>`,

                        iconSize: [36, 36],

                        iconAnchor: [18, 18]

                    });



                    const marker = L.marker([photo.lat, photo.lng], {icon: icon}).addTo(map);

                    marker.bindPopup(`

                        <div style="text-align:center;">

                            <strong>写真 ${photo.id}</strong><br>

                            <img src="${photo.dataUrl}" style="max-width:150px; max-height:100px; margin-top:5px; border-radius:4px;"><br>

                            <span style="font-size:10px; color:#666;">${photo.date}</span>

                        </div>

                    `);

                    markers.push(marker);

                    bounds.extend([photo.lat, photo.lng]);

                } else {

                    noLocationPhotos.push(photo.id);

                }

            });



            const warningEl = document.getElementById('no-location-warning');

            const listEl = document.getElementById('no-location-list');

            if (warningEl && listEl) {

                if (noLocationPhotos.length > 0) {

                    listEl.textContent = noLocationPhotos.join(', ');

                    warningEl.classList.remove('hidden');

                    warningEl.classList.add('flex');

                } else {

                    warningEl.classList.add('hidden');

                    warningEl.classList.remove('flex');

                }

            }



            const legendDirection = document.getElementById('legend-direction');

            if (legendDirection) legendDirection.style.display = hasDirection ? 'flex' : 'none';



            const fitBtn = document.getElementById('fit-map-btn');

            if (hasLocation) {

                if (fitBtn) fitBtn.style.display = 'flex';

                if (shouldFitBounds) {

                    setTimeout(() => {

                        map.invalidateSize();

                        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 20 });

                    }, 100);

                }

            } else {

                if (fitBtn) fitBtn.style.display = 'none';

            }

        }



        window.fitMapToBounds = function() {

            if (markers.length === 0) return;

            const bounds = L.latLngBounds();

            let hasLocation = false;

            photoDataList.forEach(photo => {

                if (typeof photo.lat === 'number' && Number.isFinite(photo.lat) && typeof photo.lng === 'number' && Number.isFinite(photo.lng) && !(photo.lat === 0 && photo.lng === 0)) {

                    bounds.extend([photo.lat, photo.lng]);

                    hasLocation = true;

                }

            });

            if (hasLocation) {

                map.invalidateSize();

                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 20 });

            }

        };



        window.updateTextData = function(id, field, value) {

            const photo = photoDataList.find(p => p.id === id);

            if (photo) {

                photo[field] = value;

                pushState();

            }

        };



        function escapeHtml(str) {

            if (!str) return '';

            return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        }



        window.updateHeader = function(headerId, value) {

            tableHeaders[headerId] = value;

            const inputs = document.querySelectorAll('.header-input-' + headerId);

            inputs.forEach(input => {

                if(input !== document.activeElement) input.value = value;

            });

        };



        window.updateProjectLabel = function(value) {

            projectLabelText = value;

            const inputs = document.querySelectorAll('.project-label-input');

            inputs.forEach(input => {

                if(input !== document.activeElement) input.value = value;

            });

            const mapHeaderLabel = document.getElementById('map-print-project-label');

            if (mapHeaderLabel) mapHeaderLabel.textContent = value;

        };



        const projectNameInput = document.getElementById('project-name');

        projectNameInput.addEventListener('input', function() {

            const displays = document.querySelectorAll('.project-name-display');

            displays.forEach(el => el.textContent = this.value || "工事名未入力");

            requestSave();

        });

        projectNameInput.addEventListener('change', function() { pushState(); });



        function generatePhotoCardHtml(photo) {

            let locStr = "位置情報なし";

            const isValidLoc = typeof photo.lat === 'number' && Number.isFinite(photo.lat) && typeof photo.lng === 'number' && Number.isFinite(photo.lng) && !(photo.lat === 0 && photo.lng === 0);

            if (isValidLoc) {

                let dirStr = typeof photo.direction === 'number' && Number.isFinite(photo.direction) ? `<span class="ml-2 text-gray-500 font-sans">(撮影方向: ${photo.direction.toFixed(1)}°)</span>` : '';

                locStr = `N ${photo.lat.toFixed(5)}, E ${photo.lng.toFixed(5)} ${dirStr}`;

            }



            return `

                <div class="photo-frame ${photo.selected ? 'selected' : ''}" id="photo-frame-${photo.id}">

                    <div class="flex justify-between items-center mb-1 shrink-0">

                        <div class="bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shadow-sm text-sm border-2 border-white ring-1 ring-blue-500" style="min-width: 28px; height: 28px;">

                            ${photo.id}

                        </div>

                        <div class="no-print">

                            <label class="custom-checkbox-label cursor-pointer flex items-center rounded-md px-4 py-1.5 shadow-sm select-none">

                                <input type="checkbox" class="w-5 h-5 cursor-pointer accent-blue-600" ${photo.selected ? 'checked' : ''} onchange="toggleSelect(${photo.id}, this.checked)">

                                <span class="ml-2 text-sm font-extrabold text-slate-700 transition-colors">選択</span>

                            </label>

                        </div>

                    </div>

                    <table class="photo-table">

                        <tr>

                            <td rowspan="5" class="photo-image-cell">

                                <div class="photo-image-wrapper group">

                                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden group-hover:flex gap-3 z-20 no-print">

                                        <button onclick="rotatePhoto(${photo.id}, 'ccw')" class="bg-gray-800 bg-opacity-70 text-white p-2.5 rounded-full hover:bg-opacity-100 transition shadow-lg backdrop-blur-sm" title="左へ回転">

                                            <i data-lucide="rotate-ccw" class="w-5 h-5"></i>

                                        </button>

                                        <button onclick="openMarkupModal(${photo.id})" class="bg-emerald-600 bg-opacity-90 text-white p-3 rounded-full hover:bg-opacity-100 transition shadow-lg backdrop-blur-sm border border-emerald-400" title="画像に書き込み">

                                            <i data-lucide="pen-tool" class="w-6 h-6"></i>

                                        </button>

                                        <button onclick="openAdjustModal(${photo.id})" class="bg-blue-600 bg-opacity-90 text-white p-3 rounded-full hover:bg-opacity-100 transition shadow-lg backdrop-blur-sm border border-blue-400" title="明るさ・色合い調整">

                                            <i data-lucide="sliders-horizontal" class="w-6 h-6"></i>

                                        </button>

                                        <button onclick="rotatePhoto(${photo.id}, 'cw')" class="bg-gray-800 bg-opacity-70 text-white p-2.5 rounded-full hover:bg-opacity-100 transition shadow-lg backdrop-blur-sm" title="右へ回転">

                                            <i data-lucide="rotate-cw" class="w-5 h-5"></i>

                                        </button>

                                    </div>

                                    <img src="${photo.dataUrl}" id="photo-img-${photo.id}" alt="現場写真">

                                </div>

                            </td>

                            <th><input type="text" class="w-full text-center outline-none bg-transparent font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded header-input-1" value="${escapeHtml(tableHeaders[1])}" oninput="updateHeader(1, this.value)" onchange="pushState()"></th>

                            <td><input type="text" class="w-full text-sm outline-none bg-transparent" placeholder="例：舗装工 / 掘削" value="${escapeHtml(photo.koshu)}" onchange="updateTextData(${photo.id}, 'koshu', this.value)"></td>

                        </tr>

                        <tr>

                            <th><input type="text" class="w-full text-center outline-none bg-transparent font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded header-input-2" value="${escapeHtml(tableHeaders[2])}" oninput="updateHeader(2, this.value)" onchange="pushState()"></th>

                            <td><input type="text" class="w-full text-sm outline-none bg-transparent" placeholder="例：No.1 + 5.0" value="${escapeHtml(photo.sokuten)}" onchange="updateTextData(${photo.id}, 'sokuten', this.value)"></td>

                        </tr>

                        <tr>

                            <th><input type="text" class="w-full text-center outline-none bg-transparent font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded header-input-3" value="${escapeHtml(tableHeaders[3])}" oninput="updateHeader(3, this.value)" onchange="pushState()"></th>

                            <td class="text-sm text-gray-700">${photo.date}</td>

                        </tr>

                        <tr>

                            <th><input type="text" class="w-full text-center outline-none bg-transparent font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded header-input-4" value="${escapeHtml(tableHeaders[4])}" oninput="updateHeader(4, this.value)" onchange="pushState()"></th>

                            <td class="text-[11px] text-gray-500 font-mono tracking-tighter">${locStr}</td>

                        </tr>

                        <tr>

                            <th><input type="text" class="w-full text-center outline-none bg-transparent font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded header-input-5" value="${escapeHtml(tableHeaders[5])}" oninput="updateHeader(5, this.value)" onchange="pushState()"></th>

                            <td class="align-top relative p-0">

                                <div class="absolute inset-0 p-1">

                                    <textarea class="w-full h-full text-sm outline-none resize-none leading-relaxed bg-transparent" placeholder="施工状況や特記事項を入力してください..." onchange="updateTextData(${photo.id}, 'bikou', this.value)">${escapeHtml(photo.bikou)}</textarea>

                                </div>

                            </td>

                        </tr>

                    </table>

                </div>

            `;

        }



        function generatePageHeaderHtml(projectName) {

            return `

                <div class="flex justify-between items-end border-b-2 border-gray-800 pb-2 mb-3 shrink-0">

                    <div class="text-xl font-bold tracking-widest">写真管理台帳</div>

                    <div class="text-sm font-medium flex items-center">

                        <input type="text" class="w-20 text-right outline-none bg-transparent font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 rounded project-label-input" value="${escapeHtml(projectLabelText)}" oninput="updateProjectLabel(this.value)" onchange="pushState()">

                        <span class="border-b border-gray-400 px-2 project-name-display min-w-[150px]">${escapeHtml(projectName)}</span>

                    </div>

                </div>

            `;

        }



        function renderReport() {

            const container = document.getElementById('report-container');

            container.innerHTML = '';

            

            const projectName = document.getElementById('project-name').value || "工事名未入力";

            const pagesCount = Math.ceil(photoDataList.length / PHOTOS_PER_PAGE);



            for (let p = 0; p < pagesCount; p++) {

                const pageStartIndex = p * PHOTOS_PER_PAGE;

                const pagePhotos = photoDataList.slice(pageStartIndex, pageStartIndex + PHOTOS_PER_PAGE);



                const pageDiv = document.createElement('div');

                pageDiv.className = 'report-page';

                

                const headerHtml = generatePageHeaderHtml(projectName);

                

                let photosHtml = '<div class="flex-1 grid grid-rows-3 gap-2 min-h-0">';

                pagePhotos.forEach(photo => {

                    photosHtml += generatePhotoCardHtml(photo);

                });

                photosHtml += '</div>';



                pageDiv.innerHTML = headerHtml + photosHtml;

                container.appendChild(pageDiv);

            }

            lucide.createIcons();

        }



        function triggerPrint() {

            // アプリ内プレビューモードを有効化

            document.body.classList.add('print-preview-mode');

            document.getElementById('print-preview-bar').classList.remove('hidden');

            document.getElementById('print-preview-bar').classList.add('flex');

            

            // 邪魔になるUIを隠す

            document.getElementById('zoom-controls').style.display = 'none';

            document.getElementById('sort-controls').style.display = 'none';

            

            if (map) {

                map.invalidateSize();

                if (markers.length > 0) {

                    const bounds = L.latLngBounds();

                    photoDataList.forEach(photo => {

                        if (typeof photo.lat === 'number' && Number.isFinite(photo.lat) && typeof photo.lng === 'number' && Number.isFinite(photo.lng) && !(photo.lat === 0 && photo.lng === 0)) {

                            bounds.extend([photo.lat, photo.lng]);

                        }

                    });

                    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 20, animate: false });

                }

            }

            lucide.createIcons();

        }



        window.exitPrintPreview = function() {

            document.body.classList.remove('print-preview-mode');

            document.getElementById('print-preview-bar').classList.add('hidden');

            document.getElementById('print-preview-bar').classList.remove('flex');

            

            document.getElementById('zoom-controls').style.display = '';

            document.getElementById('sort-controls').style.display = '';

            

            if (map) {

                map.invalidateSize();

                if (markers.length > 0) {

                    const bounds = L.latLngBounds();

                    photoDataList.forEach(photo => {

                        if (typeof photo.lat === 'number' && Number.isFinite(photo.lat) && typeof photo.lng === 'number' && Number.isFinite(photo.lng) && !(photo.lat === 0 && photo.lng === 0)) {

                            bounds.extend([photo.lat, photo.lng]);

                        }

                    });

                    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 20, animate: false });

                }

            }

        };



        window.addEventListener('beforeprint', () => { if (map) map.invalidateSize(); });

        

        if (window.matchMedia) {

            window.matchMedia('print').addEventListener('change', (mql) => {

                if (mql.matches && map) map.invalidateSize();

            });

        }



        window.updateSortButtonsVisibility = function() {

            const hasSelection = photoDataList.some(p => p.selected);

            const sortControls = document.getElementById('sort-controls');

            if (hasSelection) {

                sortControls.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');

            } else {

                sortControls.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');

            }

        };



        window.toggleSelect = function(id, checked) {

            const photo = photoDataList.find(p => p.id === id);

            if (photo) photo.selected = checked;

            updateSortButtonsVisibility();

            

            const frame = document.getElementById(`photo-frame-${id}`);

            if (frame) {

                if (checked) frame.classList.add('selected');

                else frame.classList.remove('selected');

            }

        };



        window.clearSelection = function() {

            photoDataList.forEach(photo => photo.selected = false);

            const checkboxes = document.querySelectorAll('.photo-frame input[type="checkbox"]');

            checkboxes.forEach(cb => cb.checked = false);

            const frames = document.querySelectorAll('.photo-frame');

            frames.forEach(frame => frame.classList.remove('selected'));

            updateSortButtonsVisibility();

        };



        function updateIdsAndRender() {

            photoDataList.forEach((p, index) => p.id = index + 1);

            renderReport();

            updateMap(false);

            updateSortButtonsVisibility();

        }



        const zoomSlider = document.getElementById('zoom-slider');

        const zoomValue = document.getElementById('zoom-value');

        const reportContainer = document.getElementById('report-container');

        const zoomControls = document.getElementById('zoom-controls');

        let isManualZoomed = false; 



        window.fitZoomToScreen = function(forceAuto = false) {

            const mainContent = document.querySelector('.main-content');

            if (!mainContent) return;

            if (forceAuto) isManualZoomed = false; 

            const a4WidthPx = (210 / 25.4) * 96; 

            const availableWidth = mainContent.clientWidth - 88; 

            let targetZoom = Math.floor((availableWidth / a4WidthPx) * 100);

            if (targetZoom < parseInt(zoomSlider.min)) targetZoom = parseInt(zoomSlider.min);

            if (targetZoom > parseInt(zoomSlider.max)) targetZoom = parseInt(zoomSlider.max);

            zoomSlider.value = targetZoom;

            zoomSlider.dispatchEvent(new Event('input', { bubbles: true }));

        };



        zoomSlider.addEventListener('input', function(e) {

            if (e.isTrusted) isManualZoomed = true; 

            const val = this.value;

            zoomValue.textContent = val + '%';

            reportContainer.style.zoom = val / 100;

        });



        zoomControls.addEventListener('wheel', function(e) {

            e.preventDefault(); 

            isManualZoomed = true;

            if (e.deltaY < 0) changeZoom(10); 

            else if (e.deltaY > 0) changeZoom(-10); 

        }, { passive: false });



        window.changeZoom = function(delta) {

            isManualZoomed = true;

            let newVal = parseInt(zoomSlider.value) + delta;

            if (newVal < parseInt(zoomSlider.min)) newVal = parseInt(zoomSlider.min);

            if (newVal > parseInt(zoomSlider.max)) newVal = parseInt(zoomSlider.max);

            zoomSlider.value = newVal;

            zoomSlider.dispatchEvent(new Event('input')); 

        };



        function updateZoomVisibility() {

            if (photoDataList.length > 0) {

                zoomControls.classList.remove('opacity-0', 'pointer-events-none');

            } else {

                zoomControls.classList.add('opacity-0', 'pointer-events-none');

            }

        }

        

        let resizeTimeout;

        window.addEventListener('resize', () => {

            if (!isManualZoomed && photoDataList.length > 0) {

                clearTimeout(resizeTimeout);

                resizeTimeout = setTimeout(() => fitZoomToScreen(false), 200);

            }

        });



        window.moveSelectedUp = function() {

            let moved = false;

            for (let i = 1; i < photoDataList.length; i++) {

                if (photoDataList[i].selected && !photoDataList[i-1].selected) {

                    let temp = photoDataList[i];

                    photoDataList[i] = photoDataList[i-1];

                    photoDataList[i-1] = temp;

                    moved = true;

                }

            }

            if (moved) { updateIdsAndRender(); pushState(); }

        };



        window.moveSelectedDown = function() {

            let moved = false;

            for (let i = photoDataList.length - 2; i >= 0; i--) {

                if (photoDataList[i].selected && !photoDataList[i+1].selected) {

                    let temp = photoDataList[i];

                    photoDataList[i] = photoDataList[i+1];

                    photoDataList[i+1] = temp;

                    moved = true;

                }

            }

            if (moved) { updateIdsAndRender(); pushState(); }

        };



        window.confirmDeleteSelected = function() {

            document.getElementById('delete-confirm-modal').classList.remove('hidden');

            document.getElementById('delete-confirm-modal').classList.add('flex');

        };



        window.closeDeleteConfirmModal = function() {

            document.getElementById('delete-confirm-modal').classList.add('hidden');

            document.getElementById('delete-confirm-modal').classList.remove('flex');

        };



        window.executeDeleteSelected = function() {

            closeDeleteConfirmModal();

            photoDataList = photoDataList.filter(photo => !photo.selected);

            updateIdsAndRender();

            if (photoDataList.length === 0) {

                const emptyState = document.getElementById('empty-state');

                if (emptyState) emptyState.style.display = 'flex';

                updateZoomVisibility();

                document.getElementById('file-input').value = '';

                const warningEl = document.getElementById('no-location-warning');

                if (warningEl) {

                    warningEl.classList.add('hidden');

                    warningEl.classList.remove('flex');

                }

            }

            pushState();

        };



        window.rotatePhoto = async function(photoId, direction) {

            const photoIndex = photoDataList.findIndex(p => p.id === photoId);

            if (photoIndex === -1) return;

            const photo = photoDataList[photoIndex];

            const degrees = direction === 'cw' ? 90 : -90;

            

            if (!photo.pureDataUrl) photo.pureDataUrl = photo.originalDataUrl || photo.dataUrl;

            

            const loadingOverlay = document.getElementById('loading-overlay');

            const loadingText = document.getElementById('loading-text');

            loadingText.innerText = '画像を回転中...';

            loadingOverlay.classList.add('active');

            

            try {

                const rotateImage = (imgSrc, isPng = false) => {

                    if (!imgSrc) return null;

                    return new Promise((resolve, reject) => {

                        const img = new Image();

                        img.onload = () => {

                            const canvas = document.createElement('canvas');

                            const ctx = canvas.getContext('2d');

                            if (Math.abs(degrees) === 90 || Math.abs(degrees) === 270) {

                                canvas.width = img.height;

                                canvas.height = img.width;

                            } else {

                                canvas.width = img.width;

                                canvas.height = img.height;

                            }

                            ctx.translate(canvas.width / 2, canvas.height / 2);

                            ctx.rotate(degrees * Math.PI / 180);

                            ctx.drawImage(img, -img.width / 2, -img.height / 2);

                            resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9));

                        };

                        img.onerror = reject;

                        img.src = imgSrc;

                    });

                };

                

                // 元画像と書き込みレイヤーをそれぞれ回転

                photo.pureDataUrl = await rotateImage(photo.pureDataUrl, false);

                if (photo.markupDataUrl) {

                    photo.markupDataUrl = await rotateImage(photo.markupDataUrl, true);

                }

                

                // 合成して表示用URLを更新

                await rebuildPhotoDataUrl(photo);

                

                const imgElement = document.getElementById(`photo-img-${photo.id}`);

                if (imgElement) imgElement.src = photo.dataUrl;

                

                updateMap(false);

                pushState();

            } catch (e) {

                console.error("回転エラー", e);

                showAlertModal("画像の回転に失敗しました。");

            }

            loadingOverlay.classList.remove('active');

        };



        let currentAdjustPhotoId = null;

        window.openAdjustModal = function(photoId) {

            const photo = photoDataList.find(p => p.id === photoId);

            if (!photo) return;

            currentAdjustPhotoId = photoId;

            if (!photo.pureDataUrl) photo.pureDataUrl = photo.originalDataUrl || photo.dataUrl;

            if (!photo.adjustments) photo.adjustments = { brightness: 100, contrast: 100, saturate: 100 };

            

            document.getElementById('adjust-preview-base').src = photo.pureDataUrl;

            const markupImg = document.getElementById('adjust-preview-markup');

            if (photo.markupDataUrl) {

                markupImg.src = photo.markupDataUrl;

                markupImg.classList.remove('hidden');

            } else {

                markupImg.classList.add('hidden');

            }

            

            document.getElementById('slider-brightness').value = photo.adjustments.brightness;

            document.getElementById('slider-contrast').value = photo.adjustments.contrast;

            document.getElementById('slider-saturate').value = photo.adjustments.saturate;

            

            updateAdjustPreview();

            document.getElementById('adjust-modal').classList.remove('hidden');

            document.getElementById('adjust-modal').classList.add('flex');

            lucide.createIcons();

        };



        window.closeAdjustModal = function() {

            document.getElementById('adjust-modal').classList.add('hidden');

            document.getElementById('adjust-modal').classList.remove('flex');

            currentAdjustPhotoId = null;

            document.getElementById('adjust-preview-base').style.filter = '';

        };



        window.updateAdjustPreview = function() {

            const b = document.getElementById('slider-brightness').value;

            const c = document.getElementById('slider-contrast').value;

            const s = document.getElementById('slider-saturate').value;

            

            document.getElementById('val-brightness').textContent = b + '%';

            document.getElementById('val-contrast').textContent = c + '%';

            document.getElementById('val-saturate').textContent = s + '%';

            

            document.getElementById('adjust-preview-base').style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

        };



        window.resetAdjustments = function() {

            document.getElementById('slider-brightness').value = 100;

            document.getElementById('slider-contrast').value = 100;

            document.getElementById('slider-saturate').value = 100;

            updateAdjustPreview();

        };



        window.applyAdjustments = async function() {

            if (!currentAdjustPhotoId) return;

            const photo = photoDataList.find(p => p.id === currentAdjustPhotoId);

            if (!photo) return;



            const b = parseInt(document.getElementById('slider-brightness').value);

            const c = parseInt(document.getElementById('slider-contrast').value);

            const s = parseInt(document.getElementById('slider-saturate').value);



            const loadingOverlay = document.getElementById('loading-overlay');

            const loadingText = document.getElementById('loading-text');

            loadingText.innerText = '画像を調整中...';

            loadingOverlay.classList.add('active');



            try {

                photo.adjustments = { brightness: b, contrast: c, saturate: s };

                await rebuildPhotoDataUrl(photo);

                

                const imgElement = document.getElementById(`photo-img-${photo.id}`);

                if (imgElement) imgElement.src = photo.dataUrl;

                

                updateMap(false);

                pushState();

            } catch (e) {

                console.error("画像調整エラー", e);

                showAlertModal("画像の調整に失敗しました。");

            }

            

            loadingOverlay.classList.remove('active');

            closeAdjustModal();

        };



        // --- 画像マークアップ（書き込み）機能 ---

        let currentEditingPhotoId = null;

        let markupCanvas = document.getElementById('markup-canvas');

        let markupCtx = markupCanvas.getContext('2d');

        let overlayCanvas = document.getElementById('markup-overlay-canvas');

        let overlayCtx = overlayCanvas.getContext('2d');

        

        let isDrawing = false;

        let startX = 0, startY = 0;

        let currentTool = 'pen';

        

        let markupHistory = [];

        let markupRedoHistory = [];

        let baseImage = null; // モーダルを開いた時のベース画像

        let freehandPoints = []; // ペンツールの軌跡保存用

        

        const textInput = document.getElementById('markup-text-input');

        let isTyping = false;

        let textX = 0, textY = 0;



        window.changeMarkupSize = function(delta) {

            const slider = document.getElementById('markup-size');

            let newVal = parseInt(slider.value) + delta;

            if (newVal < parseInt(slider.min)) newVal = parseInt(slider.min);

            if (newVal > parseInt(slider.max)) newVal = parseInt(slider.max);

            slider.value = newVal;

        };



        window.setMarkupTool = function(toolName) {

            commitMarkupText();

            currentTool = toolName;

            document.querySelectorAll('.markup-tool-btn').forEach(btn => {

                btn.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-500');

            });

            const activeBtn = document.getElementById(`tool-${toolName}`);

            if (activeBtn) {

                activeBtn.classList.add('bg-blue-100', 'ring-2', 'ring-blue-500');

            }

            if (toolName === 'text') {

                markupCanvas.parentElement.style.cursor = 'text';

            } else {

                markupCanvas.parentElement.style.cursor = 'crosshair';

            }

        };



        function getPointerPos(e, canvas) {

            const rect = canvas.getBoundingClientRect();

            // 表示サイズと内部サイズ（ピクセル）の比率を考慮

            const scaleX = canvas.width / rect.width;

            const scaleY = canvas.height / rect.height;

            let clientX = e.clientX;

            let clientY = e.clientY;

            

            // タッチイベント対応

            if (e.touches && e.touches.length > 0) {

                clientX = e.touches[0].clientX;

                clientY = e.touches[0].clientY;

            } else if (e.changedTouches && e.changedTouches.length > 0) {

                clientX = e.changedTouches[0].clientX;

                clientY = e.changedTouches[0].clientY;

            }

            

            return {

                x: (clientX - rect.left) * scaleX,

                y: (clientY - rect.top) * scaleY

            };

        }



        window.saveMarkupState = function() {

            markupHistory.push(markupCanvas.toDataURL());

            markupRedoHistory = []; 

            if (markupHistory.length > 20) markupHistory.shift(); 

        };



        window.undoMarkup = function() {

            commitMarkupText();

            if (markupHistory.length > 0) {

                markupRedoHistory.push(markupCanvas.toDataURL());

                const imgData = markupHistory.pop();

                const img = new Image();

                img.onload = () => {

                    markupCtx.clearRect(0, 0, markupCanvas.width, markupCanvas.height);

                    markupCtx.drawImage(img, 0, 0);

                };

                img.src = imgData;

            }

        };



        window.redoMarkup = function() {

            commitMarkupText();

            if (markupRedoHistory.length > 0) {

                markupHistory.push(markupCanvas.toDataURL());

                const imgData = markupRedoHistory.pop();

                const img = new Image();

                img.onload = () => {

                    markupCtx.clearRect(0, 0, markupCanvas.width, markupCanvas.height);

                    markupCtx.drawImage(img, 0, 0);

                };

                img.src = imgData;

            }

        };



        window.clearMarkup = function() {

            commitMarkupText();

            saveMarkupState();

            markupCtx.clearRect(0, 0, markupCanvas.width, markupCanvas.height);

        };



        // 図形を「白い縁取り付き」で描画する共通設定関数

        function setStrokeStyleWithOutline(ctx, color, size, isOutline) {

            ctx.lineCap = 'round';

            ctx.lineJoin = 'round';

            if (isOutline) {

                ctx.strokeStyle = '#ffffff';

                ctx.lineWidth = parseInt(size) + 4; // 縁取りは太く

            } else {

                ctx.strokeStyle = color;

                ctx.lineWidth = parseInt(size);

            }

        }



        overlayCanvas.addEventListener('pointerdown', (e) => {

            if (e.button !== 0 && e.type !== 'touchstart') return; 

            

            if (isTyping && currentTool !== 'text') {

                commitMarkupText();

                return;

            }



            const pos = getPointerPos(e, overlayCanvas);

            startX = pos.x;

            startY = pos.y;

            

            if (currentTool === 'text') {

                e.stopPropagation(); // 親要素へのイベント伝播を止めて、即座に確定されるのを防ぐ

                if (isTyping) {

                    commitMarkupText();

                }

                const color = document.getElementById('markup-color').value;

                const size = document.getElementById('markup-size').value;

                const fontSize = parseInt(size) * 4 + 5; // フォントサイズを従来の半分程度に変更

                

                textX = startX;

                textY = startY;

                isTyping = true;

                

                const rect = overlayCanvas.getBoundingClientRect();

                const scaleX = rect.width / overlayCanvas.width;

                const scaleY = rect.height / overlayCanvas.height;

                

                textInput.value = '';

                textInput.style.left = (startX * scaleX) + 'px';

                textInput.style.top = (startY * scaleY - (fontSize/2)) + 'px';

                textInput.style.color = color;

                textInput.style.fontSize = (fontSize * scaleY) + 'px';

                textInput.style.lineHeight = '1.2';

                textInput.style.display = 'block';

                textInput.classList.remove('hidden');

                

                setTimeout(() => textInput.focus(), 10);

                return;

            }



            isDrawing = true;

            saveMarkupState();

            

            if (currentTool === 'pen') {

                freehandPoints = [{x: startX, y: startY}];

            }

        });



        overlayCanvas.addEventListener('pointermove', (e) => {

            if (!isDrawing) return;

            const pos = getPointerPos(e, overlayCanvas);

            const x = pos.x;

            const y = pos.y;

            const color = document.getElementById('markup-color').value;

            const size = document.getElementById('markup-size').value;

            

            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            

            if (currentTool === 'pen') {

                freehandPoints.push({x: x, y: y});

                // 白枠線

                overlayCtx.beginPath();

                overlayCtx.moveTo(freehandPoints[0].x, freehandPoints[0].y);

                for(let i=1; i<freehandPoints.length; i++) overlayCtx.lineTo(freehandPoints[i].x, freehandPoints[i].y);

                setStrokeStyleWithOutline(overlayCtx, color, size, true);

                overlayCtx.stroke();

                // 中身の色

                overlayCtx.beginPath();

                overlayCtx.moveTo(freehandPoints[0].x, freehandPoints[0].y);

                for(let i=1; i<freehandPoints.length; i++) overlayCtx.lineTo(freehandPoints[i].x, freehandPoints[i].y);

                setStrokeStyleWithOutline(overlayCtx, color, size, false);

                overlayCtx.stroke();

                

            } else if (currentTool === 'line') {

                [true, false].forEach(isOutline => {

                    overlayCtx.beginPath();

                    overlayCtx.moveTo(startX, startY);

                    overlayCtx.lineTo(x, y);

                    setStrokeStyleWithOutline(overlayCtx, color, size, isOutline);

                    overlayCtx.stroke();

                });

                

            } else if (currentTool === 'rect') {

                [true, false].forEach(isOutline => {

                    overlayCtx.beginPath();

                    overlayCtx.rect(startX, startY, x - startX, y - startY);

                    setStrokeStyleWithOutline(overlayCtx, color, size, isOutline);

                    overlayCtx.stroke();

                });

                

            } else if (currentTool === 'circle') {

                const radiusX = Math.abs(x - startX) / 2;

                const radiusY = Math.abs(y - startY) / 2;

                const centerX = startX + (x - startX) / 2;

                const centerY = startY + (y - startY) / 2;

                [true, false].forEach(isOutline => {

                    overlayCtx.beginPath();

                    overlayCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);

                    setStrokeStyleWithOutline(overlayCtx, color, size, isOutline);

                    overlayCtx.stroke();

                });

                

            } else if (currentTool === 'arrow') {

                const headlen = parseInt(size) * 4 + 10;

                const angle = Math.atan2(y - startY, x - startX);

                

                [true, false].forEach(isOutline => {

                    overlayCtx.beginPath();

                    overlayCtx.moveTo(startX, startY);

                    overlayCtx.lineTo(x, y);

                    overlayCtx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));

                    overlayCtx.moveTo(x, y);

                    overlayCtx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));

                    setStrokeStyleWithOutline(overlayCtx, color, size, isOutline);

                    overlayCtx.stroke();

                });

            }

        });



        overlayCanvas.addEventListener('pointerup', (e) => {

            if (!isDrawing) return;

            isDrawing = false;

            markupCtx.drawImage(overlayCanvas, 0, 0);

            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            freehandPoints = [];

        });

        

        overlayCanvas.addEventListener('pointerout', (e) => {

            if (isDrawing) {

                isDrawing = false;

                markupCtx.drawImage(overlayCanvas, 0, 0);

                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

                freehandPoints = [];

            }

        });



        window.commitMarkupText = function() {

            if (!isTyping) return;

            const text = textInput.value;

            if (text.trim() !== '') {

                saveMarkupState();

                const color = document.getElementById('markup-color').value;

                const size = document.getElementById('markup-size').value;

                const fontSize = parseInt(size) * 4 + 5; // フォントサイズを従来の半分程度に変更

                

                markupCtx.font = `bold ${fontSize}px sans-serif`;

                markupCtx.textAlign = 'left';

                markupCtx.textBaseline = 'top';

                

                const lines = text.split('\n');

                let currentY = textY - (fontSize/2);

                

                lines.forEach(line => {

                    markupCtx.strokeStyle = '#ffffff';

                    markupCtx.lineWidth = 4;

                    markupCtx.lineJoin = 'round';

                    markupCtx.strokeText(line, textX, currentY);

                    

                    markupCtx.fillStyle = color;

                    markupCtx.fillText(line, textX, currentY);

                    currentY += fontSize * 1.2;

                });

            }

            

            textInput.value = '';

            textInput.style.display = 'none';

            textInput.classList.add('hidden'); // hiddenクラスも確実に追加

            isTyping = false;

        };



        // テキスト入力エリア外をクリックで確定

        document.getElementById('markup-scroll-area').addEventListener('pointerdown', (e) => {

            if (e.target !== textInput && isTyping) {

                commitMarkupText();

            }

        });



        window.openMarkupModal = function(photoId) {

            const photo = photoDataList.find(p => p.id === photoId);

            if (!photo) return;

            

            currentEditingPhotoId = photoId;

            markupHistory = [];

            markupRedoHistory = [];

            

            if (!photo.pureDataUrl) photo.pureDataUrl = photo.originalDataUrl || photo.dataUrl;

            

            setMarkupTool('pen');

            

            const img = new Image();

            img.onload = () => {

                const maxWidth = window.innerWidth * 0.9;

                const maxHeight = window.innerHeight * 0.7;

                let width = img.width;

                let height = img.height;

                

                if (width > maxWidth || height > maxHeight) {

                    const ratio = Math.min(maxWidth / width, maxHeight / height);

                    width *= ratio;

                    height *= ratio;

                }

                

                // 背景画像のセット

                const bgImg = document.getElementById('markup-bg-img');

                bgImg.src = photo.pureDataUrl;

                bgImg.width = width;

                bgImg.height = height;

                const { brightness = 100, contrast = 100, saturate = 100 } = photo.adjustments || {};

                bgImg.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;

                

                markupCanvas.width = width;

                markupCanvas.height = height;

                overlayCanvas.width = width;

                overlayCanvas.height = height;

                

                textInput.style.display = 'none';

                textInput.classList.add('hidden');

                isTyping = false;

                

                markupCtx.clearRect(0, 0, width, height);

                

                // 書き込みレイヤーがあれば描画

                if (photo.markupDataUrl) {

                    const mImg = new Image();

                    mImg.onload = () => {

                        markupCtx.drawImage(mImg, 0, 0, width, height);

                        baseImage = new Image();

                        baseImage.src = markupCanvas.toDataURL(); // 元に戻す用など

                    };

                    mImg.src = photo.markupDataUrl;

                } else {

                    baseImage = new Image();

                    baseImage.src = markupCanvas.toDataURL();

                }

                

                document.getElementById('markup-modal').classList.remove('hidden');

                document.getElementById('markup-modal').classList.add('flex');

            };

            img.src = photo.pureDataUrl;

        };



        window.closeMarkupModal = function() {

            commitMarkupText();

            document.getElementById('markup-modal').classList.add('hidden');

            document.getElementById('markup-modal').classList.remove('flex');

            currentEditingPhotoId = null;

            textInput.style.display = 'none';

            textInput.classList.add('hidden');

        };



        window.saveMarkup = async function() {

            commitMarkupText();

            if (!currentEditingPhotoId) return;

            

            const photo = photoDataList.find(p => p.id === currentEditingPhotoId);

            if (!photo) return;

            

            const loadingOverlay = document.getElementById('loading-overlay');

            const loadingText = document.getElementById('loading-text');

            loadingText.innerText = '書き込みを保存中...';

            loadingOverlay.classList.add('active');

            

            try {

                // キャンバスの書き込み内容のみ（透過PNG）を保存

                photo.markupDataUrl = markupCanvas.toDataURL('image/png');

                

                // レイヤーを合成して表示用画像を生成

                await rebuildPhotoDataUrl(photo);

                

                const imgElement = document.getElementById(`photo-img-${photo.id}`);

                if (imgElement) {

                    imgElement.src = photo.dataUrl;

                }

                

                updateMap(false);

                pushState();

                

            } catch (e) {

            } catch (e) {
                console.error("保存エラー", e);
                showAlertModal("画像の保存に失敗しました。");
            }
            loadingOverlay.classList.remove('active');
            closeMarkupModal();
        };