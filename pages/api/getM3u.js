// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetch from "cross-fetch";

const getUserChanDetails = async () => {
   let hmacValue;
let obj = { list: [] };

try {
    const response = await fetch("https://fox.toxic-gang.xyz/tata/hmac");
    const data = await response.json();
    const mpdCookie = data.mpd_cookie;

    const hdntlMatch = mpdCookie.match(/hdntl=([^|]*)/);
    if (hdntlMatch && hdntlMatch[0]) {
        hmacValue = hdntlMatch[0];
    } else {
        throw new Error('hdntl value not found in mpd_cookie');
    }
} catch (error) {
    console.error('Error fetching and extracting HMAC data:', error);
    return obj;
    }

    try {
        const responseChannels = await fetch("https://fox.toxic-gang.xyz/tata/channels");
        const cData = await responseChannels.json();

        if (cData && cData.data && Array.isArray(cData.data)) {
            const flatChannels = cData.data.flat();
            flatChannels.forEach(channel => {
                let clearkeyValue = null;
                if (channel.clearkeys_base64 && typeof channel.clearkeys_base64 === 'object') {
                    clearkeyValue = JSON.stringify(channel.clearkeys_base64);
                } else if (channel.clearkeys_base64 && typeof channel.clearkeys_base64 === 'string' && channel.clearkeys_base64 !== 'null') {
                    clearkeyValue = channel.clearkeys_base64;
                }

                let firstGenre = channel.genres && channel.genres.length > 0 ? channel.genres[0] : null;
                let rearrangedChannel = {
                    id: channel.id,
                    name: channel.name,
                    tvg_id: channel.tvg_id,
                    group_title: channel.genre,
                    tvg_logo: channel.logo,
                    stream_url: channel.mpd,
                    license_url: channel.license_url,
                    stream_headers: channel.manifest_headers ? (channel.manifest_headers['User-Agent'] || JSON.stringify(channel.manifest_headers)) : null,
                    drm: channel.drm,
                    is_mpd: channel.is_mpd,
                    kid_in_mpd: channel.kid_in_mpd,
                    hmac_required: channel.hmac_required,
                    key_extracted: channel.key_extracted,
                    pssh: channel.pssh,
                    clearkey: clearkeyValue,
                    hma: hmacValue
                };
                obj.list.push(rearrangedChannel);
            });
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return obj;
    }

    return obj;
};

const generateM3u = async (ud) => {
    let m3uStr = '';

    let userChanDetails = await getUserChanDetails();
    let chansList = userChanDetails.list;

    m3uStr = '#EXTM3U x-tvg-url="https://bolt.toxic-gang.xyz/epg/aio.xml.gz"\n\n';

  for (let i = 0; i < chansList.length; i++) {
    m3uStr += '#EXTINF:-1 tvg-id="' + chansList[i].id.toString() + '" ';
    m3uStr += 'group-title="' + (chansList[i].group_title) + '", tvg-logo="https://mediaready.videoready.tv/tatasky-epg/image/fetch/f_auto,fl_lossy,q_auto,h_250,w_250/' + (chansList[i].tvg_logo) + '", ' + chansList[i].name + '\n';
    m3uStr += '#KODIPROP:inputstream.adaptive.license_type=clearkey\n';
    m3uStr += '#KODIPROP:inputstream.adaptive.license_key=' + chansList[i].clearkey + '\n';
    m3uStr += '#EXTVLCOPT:http-user-agent=Mozilla/5.0\n';
    m3uStr += '#EXTHTTP:{"cookie":"' + chansList[i].hma + '"}\n';
    m3uStr += chansList[i].stream_url + '|cookie:' + chansList[i].hma + '\n\n';
}

    console.log('all done!');
    return m3uStr;
};

export default async function handler(req, res) {
    let uData = {
        tsActive: true
    };

    if (uData.tsActive) {
        let m3uString = await generateM3u(uData);
        res.status(200).send(m3uString);
    }
}
