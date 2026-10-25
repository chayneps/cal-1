import subprocess
import sys
import os

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    node_script = os.path.join(script_dir, 'generate_colorful_icons.js')
    print('Running colorful icon generator...')
    result = subprocess.run(['node', node_script], cwd=os.path.dirname(script_dir))
    sys.exit(result.returncode)

