from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='bn_lightweight_charts',
    version='0.1',
    packages=find_packages(),
    python_requires='>=3.8',
    install_requires=[
        'pandas',
        'tzlocal'
    ],
    package_data={
        'bn_lightweight_charts': ['js/*'],
    },
    author='louisnw',
    license='MIT',
    description="Python framework for TradingView's Lightweight Charts JavaScript library.",
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/louisnw01/lightweight-charts-python',
)
