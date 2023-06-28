import selenium
from selenium import webdriver
# Using Chrome to access web
driver= webdriver.Chrome(executable_path='/Users/jaymcdaniel/localhost/Interactive-map-maker/dev/python/chromedriver')
# Open the website
driver.get('https://github.com/JayMcDaniel')