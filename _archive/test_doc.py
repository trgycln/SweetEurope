import win32com.client
import os

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc_path = os.path.abspath(r"dokuments\FO Ürün Spektleri\88_Kalem_Ilk_Parti_Siparis_Spektleri\1. SUGAR FREE CARAMEL FLAVORED SYRUP.doc")
    doc = word.Documents.Open(doc_path)
    text = doc.Content.Text
    print(text[:200])
    doc.Close()
except Exception as e:
    print(f"Error: {e}")
finally:
    if word:
        word.Quit()
