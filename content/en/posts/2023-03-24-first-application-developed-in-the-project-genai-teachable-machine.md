---
title: 'First application developed in the project: GenAI Teachable Machine'
date: "2023-03-24T16:53:18"
updated: "2023-09-21T14:26:14"
slug: first-application-developed-in-the-project-genai-teachable-machine
permalink: /en/current-affairs/first-application-developed-in-the-project-genai-teachable-machine/
status: publish
sourceType: posts
excerpt: 'The project develops various tools and resources specifically designed for children and young people. The first tool is the "GenAI Teachable Machine," which is a simplified example of supervised machine learning. The application is implemented so that images uploaded to it are not transferred outside the web browser. For this reason, it is a safer way to approach the world of machine learning and artificial intelligence compared to commercial alternatives. Machine Learning in Our Everyday Lives: This…'
mainCategory: "News from"
extraCategories:
  - "Project activities"
  - "Research"
tags:
  - GenAI image classifier
  - machine learning
  - classifier
  - supervised machine learning
  - Teachable Machine
  - artificial intelligence
author: admin
layout: layouts/post.njk
lang: en
---
<p>The project develops various tools and resources specifically designed for children and young people. The first tool is the "GenAI Teachable Machine," which is a simplified example of supervised machine learning. </p>



<p>The application is implemented so that images uploaded to it are not transferred outside the web browser. For this reason, it is a safer way to approach the world of machine learning and artificial intelligence compared to commercial alternatives.</p>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Launch GenAI Image Classifier here</a></div>
</div>



<h2 class="wp-block-heading">Machine Learning in Our Everyday Lives:</h2>



<ul class="wp-block-list">
<li>University of Jyväskylä learning material "AI basics and applications" <a href="https://tim.jyu.fi/view/kurssit/tie/tiep1000/tekoalyn-sovellukset/kirja#DKUvbnUuGytQ" title="">https://tim.jyu.fi/view/kurssit/tie/tiep1000/tekoalyn-sovellukset/kirja#DKUvbnUuGytQ</a></li>



<li>Salesforce: <a>Machine Learning: 6 Examples That Transform Working Life</a>. <a href="https://www.salesforce.com/fi/blog/2021/koneoppiminen-konkreettiset-esimerkit.html" title="">https://www.salesforce.com/fi/blog/2021/koneoppiminen-konkreettiset-esimerkit.html</a></li>



<li>9 Applications of Machine Learning from Day-to-Day Life <a href="https://medium.com/app-affairs/9-applications-of-machine-learning-from-day-to-day-life-112a47a429d0" title="">https://medium.com/app-affairs/9-applications-of-machine-learning-from-day-to-day-life-112a47a429d0 </a></li>
</ul>



<h2 class="wp-block-heading">This application is actually a classifier</h2>



<blockquote class="wp-block-quote is-layout-flow wp-block-quote-is-layout-flow">
<p>In terms of machine learning, in this course we focus primarily on supervised machine learning and especially on one of its sub-areas: classification. In classification, we observe an input, such as an image of a traffic sign, and try to infer its class, such as the meaning of the traffic sign. Other classification problems include identifying fake accounts on Twitter (the input can be a list of followers and information about how quickly followers have accumulated, and the class is either "fake account" or "real account") and recognizing handwritten numbers (the input is an image and the class is a number between 0, 1, …, 9).</p>
<cite>From the Elements of AI online course, the classification section of the machine learning page <a href="https://course.elementsofai.com/fi/4/1" title="">https://course.elementsofai.com/fi/4/1</a></cite></blockquote>



<h2 class="wp-block-heading">Application user interface</h2>



<p>In practice, the user teaches the AI application in a guided manner using training data. Training data is material that the user prepares themselves. In practice, the material for this application consists of images that can be obtained from internet image libraries or captured using a webcam. </p>



<p><em>Note! The application is designed so that it can be used on a computer as well as on tablets and mobile phones.</em></p>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Launch GenAI Teachable Machine here</a></div>
</div>



<h3 class="wp-block-heading">A. Main view: GenAI Teachable Machine </h3>



<p>This main view contains five different stages that guide the user through creating a supervised machine learning model. These stages are described below with screenshots.</p>



<p>Note! At the top of the classifier application there is a save button that allows you to save the classifier locally to your computer!</p>



<figure class="wp-block-image size-large"><img loading="lazy" decoding="async" width="1024" height="658" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1024x658.png" alt="" class="wp-image-540" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1024x658.png 1024w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-300x193.png 300w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-768x494.png 768w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/Luokittelija_A-1536x988.png 1536w" sizes="auto, (max-width: 1024px) 100vw, 1024px" /><figcaption class="wp-element-caption">GenAI application main view</figcaption></figure>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="276" height="598" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata.png" alt="" class="wp-image-543 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata.png 276w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetusdata-138x300.png 138w" sizes="auto, (max-width: 276px) 100vw, 276px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">Stage 1: Creating classes and adding training data</h4>



<p>In the image above is a simple rock-paper-scissors example that everyone understands should be divided into three categories (classes): rock, paper, and scissors. Additionally, there is a fourth class, empty, which contains no rock, paper, or scissors. Together, this forms the training data that is used to teach the AI. Do this:</p>



<ul class="wp-block-list">
<li>Divide the material to be taught to the AI into classes, such as empty, scissors, paper, rock. </li>



<li>Add the classes to the GenAI application and name them.</li>



<li>Import a sufficient amount of training data into each class so that the AI will learn what, for example, rock looks like in the rock-paper-scissors example. This can be done using a camera or existing images.</li>
</ul>
</div></div>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:auto 24%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">Stage 2: Teach the machine learning model the data added in stage 1</h4>



<p>The AI behind the GenAI classifier is based on supervised learning. A moment ago you created classes and imported the necessary training data into them. At this stage, the AI is taught to recognize the differences and similarities between the data divided into different classes. You don't need to do anything but press a button.</p>



<ul class="wp-block-list">
<li>Press the "train classifier" button and wait until "classifier trained" appears.</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="200" height="147" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/opetaluokittelija.png" alt="" class="wp-image-542 size-full"/></figure></div>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="200" height="444" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote.png" alt="" class="wp-image-541 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote.png 200w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/syote-135x300.png 135w" sizes="auto, (max-width: 200px) 100vw, 200px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">Stage 3: Check how the classifier you just trained works?</h4>



<p>Now it's time to explore how the guided machine learning model works? Can it distinguish between rock, paper, and scissors? You can easily see this from the percentage bars below the "input" camera window. You can return to stage 1 and improve the training data if the recognition is uncertain or if it even recognizes incorrectly. If you change the training data, you also need to train it by pressing "train classifier"</p>



<ul class="wp-block-list">
<li>To know if the AI works correctly, it must be tested. Testing is done by showing the model a new image from the subject matter of the classified contents. In the UI image, I showed the "scissors" gesture with my fingers to the camera (visible at the input location).</li>



<li>Look at the confidence of the classification in the percentage bars below the "input" screen. If necessary, you can correct your model by going back to the training material (stage 1) and retraining the AI (stage 2)</li>



<li>When you are satisfied with the classifier's performance, press "next" and move to the next stage</li>
</ul>
</div></div>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-vertically-aligned-top is-style-tw-shadow" style="grid-template-columns:auto 24%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">Stage 4: Plan how the classifier responds to its observations</h4>



<p>At this stage, you can plan how the classifier responds when it detects classified information in the input. For example, you can plan how the GenAI classifier responds when it detects scissors, paper, rock, or scissors? </p>



<p>You can add the following content:</p>



<ul class="wp-block-list">
<li><em>Image:</em> you can add (or drag) an image, which can also be an animated gif</li>



<li><em>Sound:</em> you can add or record an audio file</li>



<li><em>Text:</em> you can add text and format it with basic tools</li>



<li><em>Link:</em> you can add, for example, a YouTube video or other web content (blocked when set to grades 4-9 in the application settings)</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="214" height="785" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta.png" alt="" class="wp-image-544 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta.png 214w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/toiminta-82x300.png 82w" sizes="auto, (max-width: 214px) 100vw, 214px" /></figure></div>



<div class="wp-block-media-text alignwide is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:24% auto"><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="280" height="325" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos.png" alt="" class="wp-image-545 size-full" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos.png 280w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/tulos-258x300.png 258w" sizes="auto, (max-width: 280px) 100vw, 280px" /></figure><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">Stage 5: Result </h4>



<p>This "result" window contains a preview of what the different functions look like. In the image, the classifier has recognized the "scissors" gesture and displays both the scissors as a gif animation and as text.</p>



<ul class="wp-block-list">
<li>Note! When you press the "deploy" button, you will enter full-screen mode.</li>
</ul>
</div></div>



<h3 class="wp-block-heading">B. End view: AI hidden</h3>



<div class="wp-block-media-text alignwide has-media-on-the-right is-stacked-on-mobile is-style-tw-shadow" style="grid-template-columns:auto 34%"><div class="wp-block-media-text__content">
<h4 class="wp-block-heading">The "Application" in full-screen mode and the AI hidden</h4>



<p>In full-screen mode, the actual AI itself is already hidden in the same way it is hidden in, for example, a robot vacuum, social media, or even a car.</p>



<ul class="wp-block-list">
<li>You can use the machine learning model using either a webcam or image files (bottom bar). </li>



<li>A camera preview window helps make webcam use easier</li>



<li>You can also adjust the volume.</li>
</ul>
</div><figure class="wp-block-media-text__media"><img loading="lazy" decoding="async" width="698" height="684" src="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy.png" alt="" class="wp-image-546" srcset="https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy.png 698w, https://www.generation-ai-stn.fi/wp-content/uploads/2023/04/deploy-300x294.png 300w" sizes="auto, (max-width: 698px) 100vw, 698px" /></figure></div>



<div class="wp-block-buttons is-content-justification-center is-layout-flex wp-container-core-buttons-is-layout-16018d1d wp-block-buttons-is-layout-flex">
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://tm.generation-ai-stn.fi">Launch GenAI Image Classifier here</a></div>
</div>



<p></p>