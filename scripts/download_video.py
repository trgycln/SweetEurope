import urllib.request
import re

req = urllib.request.Request('https://www.pexels.com/search/videos/barista/', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    # Pexels embeds video links in the HTML
    links = re.findall(r'https://player\.vimeo\.com/external/[^\.\]]+\.sd\.mp4[^\"\'\s]+', html)
    
    if links:
        url = links[0]
        print('Downloading:', url)
        urllib.request.urlretrieve(url, 'public/hero-video-new.mp4')
        print('Downloaded successfully!')
    else:
        print('No links found in the HTML.')
        
except Exception as e:
    print('Error:', e)
